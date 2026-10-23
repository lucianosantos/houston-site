import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preferredLanguagePath } from '../lib/preferred-language.mjs'
import { languageResponse } from '../lib/language-response.mjs'

test('Portuguese browser variants use Portuguese and English variants use English', () => {
  for (const language of ['pt', 'pt-BR', 'pt-PT', 'PT-br']) assert.equal(preferredLanguagePath(language), '/pt-br')
  for (const language of ['en', 'en-US', 'en-GB']) assert.equal(preferredLanguagePath(language), '/en-us')
})
test('language selection honors browser quality ordering and stable ties', () => {
  assert.equal(preferredLanguagePath('pt-BR;q=0.5,en-US;q=0.9'), '/en-us')
  assert.equal(preferredLanguagePath('fr-FR,pt-BR;q=0.8,en;q=0.5'), '/pt-br')
  assert.equal(preferredLanguagePath('en;q=0.8,pt;q=0.8'), '/en-us')
  assert.equal(preferredLanguagePath('pt;q=0,en;q=0.5'), '/en-us')
})
test('unsupported or malformed preferences fall back to English', () => {
  for (const language of ['', 'fr-FR,de;q=0.9', '*', 'pt;q=invalid', 'pt;q=2', 'pt;q=-1']) {
    assert.equal(preferredLanguagePath(language), '/en-us')
  }
})
test('root redirect preserves query parameters and prevents language-dependent caching', () => {
  const request = new Request('https://houston.example/?campaign=launch', { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' } })
  const response = languageResponse({ request })
  assert.equal(response.status, 302)
  assert.equal(response.headers.get('Location'), 'https://houston.example/pt-br?campaign=launch')
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(response.headers.get('Vary'), 'Accept-Language')
})

