import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.mjs'

test('Worker root uses browser language and never invokes static assets', async () => {
  const env = { ASSETS: { fetch() { assert.fail('Root must run before static assets') } } }
  const response = await worker.fetch(new Request('https://houston.example/?source=test', { headers: { 'Accept-Language': 'pt-BR' } }), env)
  assert.equal(response.status, 302)
  assert.equal(response.headers.get('Location'), 'https://houston.example/pt-br?source=test')
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal((await worker.fetch(new Request('https://houston.example/', { method: 'POST' }), env)).status, 405)
})
test('localized pages and unknown paths delegate to the static asset binding', async () => {
  for (const path of ['/en-us', '/pt-br', '/favicon.svg', '/missing']) {
    let seen
    const request = new Request('https://houston.example' + path)
    const response = await worker.fetch(request, { ASSETS: { fetch(input) { seen = input; return new Response('static', { status: path === '/missing' ? 404 : 200 }) } } })
    assert.equal(seen, request)
    assert.equal(response.status, path === '/missing' ? 404 : 200)
  }
})
test('game requests use R2 and never fall through to static assets', async () => {
  let key
  const response = await worker.fetch(new Request('https://houston.example/game/latest/index.html'), {
    ASSETS: { fetch() { assert.fail('Game must come from R2') } },
    GAME_BUCKET: { get: async input => {
      key = input
      return { size: 4, body: 'game', httpEtag: '"current"', writeHttpMetadata(headers) { headers.set('Content-Type', 'text/html') } }
    } }
  })
  assert.equal(key, 'game/latest/index.html')
  assert.equal(await response.text(), 'game')
  assert.equal(response.headers.get('Cache-Control'), 'no-cache')
})
