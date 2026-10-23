import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createGameRelease, uploadSettings, uploadRelease } from './game-release.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const gameRoot = fileURLToPath(new URL('../public/game/', import.meta.url))
const dryRun = process.argv.includes('--dry-run')
const settings = dryRun ? null : uploadSettings()
const release = await createGameRelease(gameRoot)
const env = { ...process.env, NUXT_PUBLIC_GAME_URL: release.url }
async function run(script, args = []) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: root, env, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('Build step failed: ' + script)))
  })
}
// Validate the site before overwriting the live game.
env.npm_lifecycle_event = 'build'
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'generate'], { cwd: root, env, stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error('Nuxt generation failed.')))
})
// Only generated copies are removed; the committed source export stays intact.
await rm(new URL('../dist/game/', import.meta.url), { recursive: true, force: true })
await run('scripts/finalize-build.mjs')
await run('scripts/check-output.mjs')
await run('node_modules/wrangler/bin/wrangler.js', ['deploy', '--dry-run', '--outdir', '.wrangler/deploy-check'])
if (!dryRun) {
  const sdk = await import('@aws-sdk/client-s3')
  const client = new sdk.S3Client({
    region: 'auto', endpoint: 'https://' + settings.accountId + '.r2.cloudflarestorage.com',
    credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED', maxAttempts: 3
  })
  try { await uploadRelease(client, sdk, settings, release, gameRoot) }
  finally { client.destroy() }
}
console.log('Latest game: ' + release.url)
if (dryRun) console.log('VALIDATION ONLY: no R2 upload performed. Do not deploy this output.')
