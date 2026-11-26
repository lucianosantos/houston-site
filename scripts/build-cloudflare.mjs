import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const env = { ...process.env, NUXT_PUBLIC_GAME_URL: '/game/latest/index.html' }
async function run(script, args = []) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: root, env, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('Build step failed: ' + script)))
  })
}
// Build only the website; never overwrite published R2 binaries.
env.npm_lifecycle_event = 'build'
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'generate'], { cwd: root, env, stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error('Nuxt generation failed.')))
})
// Local build exports must never become Worker static assets.
await rm(new URL('../dist/game/', import.meta.url), { recursive: true, force: true })
await run('scripts/finalize-build.mjs')
await run('scripts/check-output.mjs')
await run('node_modules/wrangler/bin/wrangler.js', ['deploy', '--dry-run', '--outdir', '.wrangler/deploy-check'])
console.log('Site ready. Game binaries are published separately with npm run publish:game.')
