import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export const bucketName = 'firefly-houston'
export function gameMetadata(path) {
  const compressed = path.endsWith('.br')
  const plain = compressed ? path.slice(0, -3) : path
  const extension = plain.split('.').pop().toLowerCase()
  const types = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', wasm: 'application/wasm', data: 'application/octet-stream', png: 'image/png', jpg: 'image/jpeg', ico: 'image/x-icon', json: 'application/json' }
  return { ContentType: types[extension] || 'application/octet-stream',
    ...(compressed ? { ContentEncoding: 'br' } : {}),
    CacheControl: 'no-cache' }
}
export async function createGameRelease(root) {
  const files = []
  async function walk(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name
      if (entry.isSymbolicLink()) throw new Error('Game exports must not contain symbolic links.')
      if (entry.isDirectory()) await walk(join(directory, entry.name), relative + '/')
      else if (entry.isFile() && !/\.md$/i.test(relative)) {
        const hash = createHash('sha256')
        for await (const chunk of createReadStream(join(root, relative))) hash.update(chunk)
        files.push({ relative, size: (await stat(join(root, relative))).size, sha256: hash.digest('hex'), ...gameMetadata(relative) })
      }
    }
  }
  await walk(root)
  for (const required of ['index.html', 'Build/web.loader.js', 'Build/web.data.br', 'Build/web.framework.js.br', 'Build/web.wasm.br']) {
    if (!files.some(file => file.relative === required)) throw new Error('Missing game export file: ' + required)
  }
  files.sort((a, b) => a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0)
  const prefix = 'game/latest/'
  return { prefix, url: '/' + prefix + 'index.html', files }
}
export function uploadSettings(env = process.env) {
  for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
    if (!env[key]?.trim()) throw new Error('Missing deploy environment variable: ' + key)
  }
  if (!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID)) throw new Error('CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID.')
  if ((env.R2_BUCKET_NAME || bucketName) !== bucketName) throw new Error('R2_BUCKET_NAME must match the GAME_BUCKET binding: ' + bucketName)
  const branch = env.CF_PAGES_BRANCH || env.DEPLOY_BRANCH
  if (branch && branch !== (env.PRODUCTION_BRANCH || 'main')) throw new Error('Only the production branch may overwrite the latest game. Use build:ci for preview validation.')
  return { accountId: env.CLOUDFLARE_ACCOUNT_ID, bucket: bucketName,
    accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY }
}
// Overwrite a single build; publish its HTML last and prune stale files only after successful uploads.
export async function uploadRelease(client, commands, settings, release, root) {
  if (release.prefix !== 'game/latest/') throw new Error('Unexpected managed game prefix.')
  const ordered = [...release.files.filter(file => file.relative !== 'index.html'), ...release.files.filter(file => file.relative === 'index.html')]
  for (const file of ordered) {
    const Key = release.prefix + file.relative
    try {
      const existing = await client.send(new commands.HeadObjectCommand({ Bucket: settings.bucket, Key }))
      if (existing.Metadata?.sha256 === file.sha256 && existing.ContentLength === file.size
          && existing.CacheControl === file.CacheControl && existing.ContentType === file.ContentType
          && existing.ContentEncoding === file.ContentEncoding) continue
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) throw error
    }
    await client.send(new commands.PutObjectCommand({
      Bucket: settings.bucket, Key, Body: createReadStream(join(root, file.relative)),
      ContentLength: file.size, ContentType: file.ContentType, ContentEncoding: file.ContentEncoding,
      CacheControl: file.CacheControl, Metadata: { sha256: file.sha256 }
    }))
    console.log('Uploaded game asset: ' + file.relative)
  }

  // Only prune this game's managed paths, after every current asset was uploaded.
  const expected = new Set(release.files.map(file => release.prefix + file.relative))
  const obsolete = []
  let token
  do {
    const page = await client.send(new commands.ListObjectsV2Command({
      Bucket: settings.bucket, Prefix: 'game/', ...(token ? { ContinuationToken: token } : {})
    }))
    for (const object of page.Contents || []) {
      const key = object.Key
      if (key && ((key.startsWith('game/latest/') && !expected.has(key))
          || /^game\/releases\/[a-f0-9]{64}\//.test(key))) obsolete.push(key)
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
    if (page.IsTruncated && !token) throw new Error('R2 listing was truncated without a continuation token.')
  } while (token)
  for (const Key of obsolete) {
    await client.send(new commands.DeleteObjectCommand({ Bucket: settings.bucket, Key }))
    console.log('Removed obsolete game asset: ' + Key)
  }
}
