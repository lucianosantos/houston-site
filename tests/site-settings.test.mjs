import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getSiteSettings } from '../scripts/site-settings.mjs'

test('an unset domain cannot accidentally produce an indexable site', () => {
  assert.deepEqual(getSiteSettings({}), { siteUrl: '', indexable: false, gameUrl: '/game/index.html' })
  assert.throws(() => getSiteSettings({ SITE_INDEXABLE: 'true' }), /SITE_URL/)
})
test('only a valid HTTPS origin is accepted as canonical', () => {
  for (const url of ['http://example.com', 'https://example.com/path', 'https://user:secret@example.com', 'https://example.com?x=1']) {
    assert.throws(() => getSiteSettings({ NUXT_PUBLIC_SITE_URL: url }))
  }
})
test('preview branches stay out of search even when production indexing is configured', () => {
  const env = { NUXT_PUBLIC_SITE_URL: 'https://example.com/', SITE_INDEXABLE: 'true', CF_PAGES_BRANCH: 'feature' }
  assert.equal(getSiteSettings(env).indexable, false)
  assert.equal(getSiteSettings({ ...env, CF_PAGES_BRANCH: 'main' }).indexable, true)
})
test('unsafe game URL protocols and protocol-relative URLs are refused', () => {
  for (const gameUrl of ['javascript:alert(1)', '//other.example/game', 'data:text/html,test']) {
    assert.throws(() => getSiteSettings({ NUXT_PUBLIC_GAME_URL: gameUrl }))
  }
  assert.equal(getSiteSettings({ NUXT_PUBLIC_GAME_URL: '/game/index.html' }).gameUrl, '/game/index.html')
})

