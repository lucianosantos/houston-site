import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import worker from '../worker/index.mjs'
import { prepareGame } from '../scripts/publish-game.mjs'
import { uploadRelease, gameMetadata, validateWebReferences } from '../scripts/game-release.mjs'

function webHtml(name = 'Web') {
  return `<head></head><script>
    var buildUrl = "Build";
    var loaderUrl = buildUrl + "/${name}.loader.js";
    var config = {
      dataUrl: buildUrl + "/${name}.data.br",
      frameworkUrl: buildUrl + "/${name}.framework.js.br",
      codeUrl: buildUrl + "/${name}.wasm.br"
    };
  </script>`
}

test('Web HTML references must match R2 object names exactly, including uppercase Web', () => {
  for (const name of ['Web', 'web']) {
    const files = ['loader.js', 'data.br', 'framework.js.br', 'wasm.br'].map(extension => ({ relative: `Build/${name}.${extension}` }))
    assert.doesNotThrow(() => validateWebReferences(webHtml(name), files))
    assert.throws(() => validateWebReferences(webHtml(name === 'Web' ? 'web' : 'Web'), files), /case-sensitive/)
    assert.throws(() => validateWebReferences(webHtml(name), files.slice(1)), /missing file/)
  }
})

test('download routes stream R2 files, force downloads and revalidate fixed URLs', async () => {
  for (const name of ['houston-windows.zip', 'houston-android.apk']) {
    let key
    const env = {
      ASSETS: { fetch() { assert.fail('Download must use R2') } },
      GAME_BUCKET: { get: async input => {
        key = input
        return { size: 3, body: 'zip', httpEtag: '"new"', writeHttpMetadata(headers) { headers.set('Content-Type', gameMetadata(name).ContentType) } }
      } }
    }
    const response = await worker.fetch(new Request('https://example.com/downloads/latest/' + name), env)
    assert.equal(response.status, 200)
    assert.equal(key, 'downloads/latest/' + name)
    assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="' + name + '"')
    assert.equal(response.headers.get('Cache-Control'), 'no-cache')
    assert.equal(await response.text(), 'zip')
  }
  const missing = await worker.fetch(new Request('https://example.com/downloads/latest/private.zip'), {})
  assert.equal(missing.status, 404)
})

test('publisher accepts current uppercase Web exports and rejects ambiguous APKs before upload', async () => {
  const root = await mkdtemp(join(tmpdir(), 'houston-publish-'))
  try {
    for (const dir of ['web/Build', 'windows/Houston_Data', 'mobile', 'windows/Houston_BurstDebugInformation_DoNotShip']) {
      await mkdir(join(root, 'public/game', dir), { recursive: true })
    }
    for (const name of ['index.html', 'Build/Web.loader.js', 'Build/Web.data.br', 'Build/Web.framework.js.br', 'Build/Web.wasm.br']) {
      await writeFile(join(root, 'public/game/web', name), name === 'index.html' ? webHtml() : 'web')
    }
    for (const name of ['Houston.exe', 'UnityPlayer.dll', 'Houston_Data/assets', 'Houston_BurstDebugInformation_DoNotShip/debug']) {
      await writeFile(join(root, 'public/game/windows', name), 'runtime')
    }
    await writeFile(join(root, 'public/game/mobile/build.apk'), 'apk')
    const prepared = await prepareGame(root)
    assert.equal(prepared.web.url, '/game/latest/index.html')
    assert.ok(prepared.web.files.some(file => file.relative === 'Build/Web.loader.js'))
    assert.ok(!prepared.web.files.some(file => file.relative === 'Build/web.loader.js'))
    const shell = await readFile(join(prepared.output, 'index.html'), 'utf8')
    assert.ok(shell.includes('/Web.loader.js'))
    assert.ok(shell.includes('href="embed.css"'))
    assert.equal(prepared.downloads.prefix, 'downloads/latest/')
    assert.equal(prepared.downloads.files[1].size, 3)
    const zip = await readFile(join(prepared.output, 'houston-windows.zip'))
    assert.equal(zip.readUInt32LE(0), 0x04034b50)
    assert.ok(zip.includes(Buffer.from('Houston_Data/assets')))
    assert.ok(!zip.includes(Buffer.from('DoNotShip')))
    await writeFile(join(root, 'public/game/mobile/old.apk'), 'old')
    await assert.rejects(prepareGame(root), /exactly one APK/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('download upload uses original APK bytes and never lists or deletes web objects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'houston-apk-'))
  class Head { constructor(input) { this.input = input } }
  class Put { constructor(input) { this.input = input } }
  class List { constructor(input) { this.input = input } }
  class Delete { constructor(input) { this.input = input } }
  const sourcePath = join(root, 'original.apk')
  try {
    await writeFile(sourcePath, 'apk')
    const calls = []
    await uploadRelease({ send: async command => {
      calls.push(command)
      if (command instanceof Head) throw Object.assign(new Error(), { $metadata: { httpStatusCode: 404 } })
      if (command instanceof Put) {
        const bytes = []
        for await (const chunk of command.input.Body) bytes.push(chunk)
        assert.equal(Buffer.concat(bytes).toString(), 'apk')
      }
      if (command instanceof List) {
        assert.equal(command.input.Prefix, 'downloads/latest/')
        return { Contents: [{ Key: 'game/latest/index.html' }, { Key: 'downloads/latest/old.apk' }] }
      }
    } }, { HeadObjectCommand: Head, PutObjectCommand: Put, ListObjectsV2Command: List, DeleteObjectCommand: Delete }, { bucket: 'test' }, {
      prefix: 'downloads/latest/', files: [{ relative: 'houston-android.apk', sourcePath, size: 3, sha256: 'hash', ...gameMetadata('file.apk') }]
    }, root)
    assert.deepEqual(calls.filter(call => call instanceof Delete).map(call => call.input.Key), ['downloads/latest/old.apk'])
  } finally { await rm(root, { recursive: true, force: true }) }
})
