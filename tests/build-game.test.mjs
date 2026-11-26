import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('Windows build orchestration cleans only output, stops on errors and copies only completed builds', { skip: process.platform !== 'win32' }, () => {
  const script = fileURLToPath(new URL('./build-game.test.ps1', import.meta.url))
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /PASS: clean output/)
})
