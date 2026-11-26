import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ZipStream from 'zip-stream'
import { createGameRelease, gameMetadata, uploadRelease, uploadSettings, validateWebReferences } from './game-release.mjs'

const siteRoot = fileURLToPath(new URL('../', import.meta.url))
const ignored = /(?:DoNotShip|BurstDebugInformation|^tempburstlibs$)/i

export async function runtimeFiles(root, prefix = '') {
  const files = []
  for (const entry of (await readdir(join(root, prefix), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) throw new Error('Symbolic links are not allowed in game exports.')
    if (ignored.test(entry.name)) continue
    const relative = prefix + entry.name
    if (entry.isDirectory()) files.push(...await runtimeFiles(root, relative + '/'))
    else if (entry.isFile()) files.push(relative)
  }
  return files
}

export async function zipWindows(root, destination) {
  const files = await runtimeFiles(root)
  if (!files.some(name => !name.includes('/') && /\.exe$/i.test(name) && !/crashhandler/i.test(name))
      || !files.includes('UnityPlayer.dll') || !files.some(name => /_Data\//.test(name))) {
    throw new Error('Incomplete Windows build: include the game EXE, UnityPlayer.dll and the entire *_Data folder.')
  }
  const archive = new ZipStream({ zlib: { level: 6 } })
  const completion = pipeline(archive, createWriteStream(destination))
  // Register immediately to prevent an unhandled rejection if disk IO fails.
  completion.catch(() => {})
  try {
    for (const name of files) {
      await new Promise((resolve, reject) => {
        const source = createReadStream(join(root, name))
        source.on('error', error => archive.destroy(error))
        const failed = error => { archive.off('error', failed); reject(error) }
        archive.once('error', failed)
        archive.entry(source, { name, date: new Date('2000-01-01T00:00:00Z') }, error => {
          archive.off('error', failed)
          if (error) reject(error)
          else resolve()
        })
      })
    }
    archive.finalize()
    await completion
  } catch (error) {
    archive.destroy(error)
    await completion.catch(() => {})
    throw error
  }
}

async function describe(root, relative) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(join(root, relative))) hash.update(chunk)
  return { relative, size: (await stat(join(root, relative))).size, sha256: hash.digest('hex'), ...gameMetadata(relative) }
}

export async function prepareGame(root = siteRoot) {
  const source = join(root, 'public/game')
  const webRoot = join(source, 'web')
  const web = await createGameRelease(webRoot)
  const originalHtml = await readFile(join(webRoot, 'index.html'), 'utf8')
  validateWebReferences(originalHtml, web.files)
  const apks = (await readdir(join(source, 'mobile'), { withFileTypes: true })).filter(entry => entry.isFile() && /\.apk$/i.test(entry.name))
  if (apks.length !== 1) throw new Error('Place exactly one APK directly in public/game/mobile (remove older APKs).')
  const apkPath = join(source, 'mobile', apks[0].name)
  const apk = await describe(join(source, 'mobile'), apks[0].name)
  if (apk.size === 0) throw new Error('The APK is empty.')
  const output = join(root, '.game-publish')
  await mkdir(output, { recursive: true })
  // Adapt a generated copy of the HTML shell; leave the Unity export untouched.
  const html = originalHtml.includes('href="embed.css"') ? originalHtml : originalHtml.replace('</head>', '<link rel="stylesheet" href="embed.css"></head>')
  await writeFile(join(output, 'index.html'), html)
  const shell = await describe(output, 'index.html')
  const cssRoot = join(siteRoot, 'scripts')
  const css = await describe(cssRoot, 'game-embed.css')
  web.files = web.files.filter(file => !['index.html', 'embed.css'].includes(file.relative))
  web.files.push({ ...shell, sourcePath: join(output, 'index.html') }, { ...css, relative: 'embed.css', sourcePath: join(cssRoot, 'game-embed.css') })
  const zip = 'houston-windows.zip'
  await zipWindows(join(source, 'windows'), join(output, zip))
  const windows = await describe(output, zip)
  // APK is streamed directly from the source; only the ZIP needs generated disk space.
  const downloads = {
    prefix: 'downloads/latest/',
    files: [windows, { ...apk, relative: 'houston-android.apk', sourcePath: apkPath }]
  }
  console.log('Web: ' + web.files.length + ' files -> /game/latest/index.html')
  for (const file of downloads.files) console.log(file.relative + ': ' + (file.size / 1024 / 1024).toFixed(1) + ' MiB -> /' + downloads.prefix + file.relative)
  return { webRoot, web, output, downloads }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const settings = dryRun ? null : uploadSettings()
  const prepared = await prepareGame()
  if (dryRun) {
    console.log('VALIDATION ONLY: ZIP prepared; nothing uploaded to R2.')
    return
  }
  const sdk = await import('@aws-sdk/client-s3')
  const client = new sdk.S3Client({
    region: 'auto', endpoint: 'https://' + settings.accountId + '.r2.cloudflarestorage.com',
    credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED', maxAttempts: 3
  })
  try {
    await uploadRelease(client, sdk, settings, prepared.downloads, prepared.output)
    await uploadRelease(client, sdk, settings, prepared.web, prepared.webRoot)
    console.log('Published Windows, Android and Web. URLs are fixed; no website rebuild is needed for future game updates.')
  } finally { client.destroy() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
