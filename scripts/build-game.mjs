import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const flags = new Set(process.argv.slice(2))
if ([...flags].some(flag => !['--copy', '--dry-run'].includes(flag))) {
  console.error('Usage: npm run build:game -- [--copy] [--dry-run]')
  process.exitCode = 1
} else if (process.platform !== 'win32') {
  console.error('build:game requires Windows and the Unity Editor with Windows, Android and Web modules.')
  process.exitCode = 1
} else {
  const script = fileURLToPath(new URL('./build-game.ps1', import.meta.url))
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script]
  if (flags.has('--copy')) args.push('-Copy')
  if (flags.has('--dry-run')) args.push('-DryRun')
  const child = spawn('powershell.exe', args, { stdio: 'inherit', windowsHide: true })
  child.on('error', error => { console.error(error.message); process.exitCode = 1 })
  child.on('exit', code => { process.exitCode = code ?? 1 })
}
