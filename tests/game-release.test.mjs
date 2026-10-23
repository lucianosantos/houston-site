import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGameRelease, gameMetadata, uploadRelease, uploadSettings } from '../scripts/game-release.mjs'
import { gameResponse } from '../lib/game-response.mjs'

class Head { constructor(input) { this.input = input } }
class Put { constructor(input) { this.input = input } }
class List { constructor(input) { this.input = input } }
class Delete { constructor(input) { this.input = input } }
const commands = { HeadObjectCommand: Head, PutObjectCommand: Put, ListObjectsV2Command: List, DeleteObjectCommand: Delete }
const notFound = () => Object.assign(new Error('Not found'), { $metadata: { httpStatusCode: 404 } })
const file = { relative: 'asset.br', size: 3, sha256: 'hash', ...gameMetadata('asset.wasm.br') }
const release = { prefix: 'game/latest/', files: [file] }

test('changed contents keep a fixed game URL; hashes are only for upload reuse', async () => {
  const root = await mkdtemp(join(tmpdir(), 'houston-game-'))
  try {
    await mkdir(join(root, 'Build'))
    for (const path of ['index.html', 'Build/web.loader.js', 'Build/web.data.br', 'Build/web.framework.js.br', 'Build/web.wasm.br']) await writeFile(join(root, path), 'first')
    const first = await createGameRelease(root)
    assert.equal(first.url, '/game/latest/index.html')
    await writeFile(join(root, 'Build/web.data.br'), 'second')
    const second = await createGameRelease(root)
    assert.equal(second.url, first.url)
    assert.notEqual(second.files.find(file => file.relative === 'Build/web.data.br').sha256, first.files.find(file => file.relative === 'Build/web.data.br').sha256)
    assert.equal(gameMetadata('Build/web.wasm.br').ContentType, 'application/wasm')
    assert.equal(gameMetadata('Build/web.wasm.br').ContentEncoding, 'br')
    assert.equal(gameMetadata('index.html').CacheControl, 'no-cache')
    await rm(join(root, 'index.html'))
    await assert.rejects(createGameRelease(root), /Missing game export/)
  } finally { await rm(root, { recursive: true, force: true }) }
})
test('credentials, bucket and production branch are checked before uploading', () => {
  assert.throws(() => uploadSettings({}), /Missing deploy/)
  const env = { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), R2_ACCESS_KEY_ID: 'test', R2_SECRET_ACCESS_KEY: 'test' }
  assert.equal(uploadSettings(env).bucket, 'firefly-houston')
  assert.throws(() => uploadSettings({ ...env, R2_BUCKET_NAME: 'other' }), /binding/)
  assert.throws(() => uploadSettings({ ...env, CF_PAGES_BRANCH: 'feature' }), /production branch/)
  assert.equal(uploadSettings({ ...env, DEPLOY_BRANCH: 'main' }).bucket, 'firefly-houston')
})
test('unchanged uploads are reused; cleanup is paginated and restricted to managed game files', async () => {
  const deleted = []
  const old = 'game/releases/' + 'a'.repeat(64) + '/Build/web.data.br'
  let pages = 0
  await uploadRelease({ send: async command => {
    if (command instanceof Head) return { ContentLength: 3, Metadata: { sha256: 'hash' }, ...file }
    if (command instanceof Put) assert.fail('Unchanged file must not be uploaded')
    if (command instanceof List) {
      pages++
      assert.equal(command.input.Prefix, 'game/')
      if (pages === 1) return { Contents: [{ Key: 'game/latest/asset.br' }, { Key: 'game/latest/removed.br' }], IsTruncated: true, NextContinuationToken: 'next' }
      assert.equal(command.input.ContinuationToken, 'next')
      return { Contents: [{ Key: old }, { Key: 'unrelated/file' }, { Key: 'game/other/file' }] }
    }
    if (command instanceof Delete) deleted.push(command.input.Key)
  } }, commands, { bucket: 'test' }, release, '.')
  assert.deepEqual(deleted, ['game/latest/removed.br', old])
})
test('changed bytes overwrite fixed keys, HTML goes last, cleanup runs after all uploads', async () => {
  const root = await mkdtemp(join(tmpdir(), 'houston-upload-'))
  try {
    await writeFile(join(root, 'asset.br'), 'abc')
    await writeFile(join(root, 'index.html'), 'abc')
    const order = []
    await uploadRelease({ send: async command => {
      if (command instanceof Head) return { ContentLength: 3, Metadata: { sha256: 'old hash' } }
      if (command instanceof Put) {
        order.push(command.input.Key)
        const chunks = []
        for await (const chunk of command.input.Body) chunks.push(chunk)
        assert.equal(Buffer.concat(chunks).toString(), 'abc')
        assert.equal(command.input.ContentLength, 3)
        assert.equal(command.input.CacheControl, 'no-cache')
        if (command.input.Key.endsWith('.br')) assert.equal(command.input.ContentEncoding, 'br')
      }
      if (command instanceof List) { order.push('cleanup'); return {} }
    } }, commands, { bucket: 'test' }, { ...release, files: [{ ...file, relative: 'index.html', ...gameMetadata('index.html') }, file] }, root)
    assert.deepEqual(order, ['game/latest/asset.br', 'game/latest/index.html', 'cleanup'])
  } finally { await rm(root, { recursive: true, force: true }) }
})
test('upload and storage failures stop before cleanup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'houston-fail-'))
  try {
    await writeFile(join(root, 'asset.br'), 'abc')
    await assert.rejects(uploadRelease({ send: async command => {
      if (command instanceof Head) throw notFound()
      if (command instanceof Put) {
        for await (const chunk of command.input.Body) void chunk
        throw new Error('Upload failed')
      }
      assert.fail('Cleanup must not run after a failed upload')
    } }, commands, { bucket: 'test' }, release, root), /Upload failed/)
    await assert.rejects(uploadRelease({ send: async () => { throw new Error('Access denied') } }, commands, { bucket: 'test' }, release, root), /Access denied/)
    await assert.rejects(uploadRelease({}, commands, {}, { prefix: 'other/', files: [] }, root), /managed game prefix/)
  } finally { await rm(root, { recursive: true, force: true }) }
})
const url = 'https://example.com/game/latest/Build/web.wasm.br'
const object = { httpEtag: '"abc"', size: 3, body: 'abc', writeHttpMetadata(headers) { headers.set('Content-Type', 'application/wasm'); headers.set('Content-Encoding', 'br') } }
test('game route preserves Brotli, revalidates caching and handles conditional requests', async () => {
  const keys = []
  const env = { GAME_BUCKET: { get: async key => { keys.push(key); return object }, head: async () => object } }
  const response = await gameResponse({ request: new Request(url), env })
  assert.equal(await response.text(), 'abc')
  assert.equal(response.headers.get('Content-Encoding'), 'br')
  assert.equal(response.headers.get('Content-Type'), 'application/wasm')
  assert.equal(response.headers.get('Cache-Control'), 'no-cache')
  assert.equal(keys[0], 'game/latest/Build/web.wasm.br')
  assert.equal(await (await gameResponse({ request: new Request(url, { method: 'HEAD' }), env })).text(), '')
  assert.equal((await gameResponse({ request: new Request(url, { headers: { 'If-None-Match': '"abc"' } }), env })).status, 304)
  const changed = { ...object, httpEtag: '"new"' }
  assert.equal((await gameResponse({ request: new Request(url, { headers: { 'If-None-Match': '"abc"' } }), env: { GAME_BUCKET: { get: async () => changed } } })).status, 200)
})
test('route rejects old release URLs and non-managed paths; failures are not cached', async () => {
  assert.equal((await gameResponse({ request: new Request(url, { method: 'PUT' }), env: {} })).status, 405)
  for (const path of ['/game/private', '/game/releases/' + 'a'.repeat(64) + '/index.html']) {
    assert.equal((await gameResponse({ request: new Request('https://example.com' + path), env: {} })).status, 404)
  }
  const missing = await gameResponse({ request: new Request(url), env: { GAME_BUCKET: { get: async () => null } } })
  assert.equal(missing.status, 404)
  assert.equal(missing.headers.get('Cache-Control'), 'no-store')
  assert.equal((await gameResponse({ request: new Request(url), env: {} })).status, 503)
})
