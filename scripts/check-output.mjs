import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { getSiteSettings } from './site-settings.mjs'
const root = new URL('../dist/', import.meta.url)
const { siteUrl, indexable, gameUrl } = getSiteSettings()

for (const [file, lang, locale, heading] of [
  ['index.html', 'en-US', 'en-us', 'Prefer to download?'],
  ['en-us.html', 'en-US', 'en-us', 'Prefer to download?'],
  ['pt-br.html', 'pt-BR', 'pt-br', 'Prefere baixar?']
]) {
  const html = await readFile(new URL(file, root), 'utf8')
  assert.ok(html.includes(gameUrl), `Missing configured game URL in ${file}`)
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1)
  assert.ok(html.includes(`lang="${lang}"`), `Missing language in ${file}`)
  assert.ok(html.includes(heading), `Missing localized content in ${file}`)
  for (const name of ['Jhonatan Brendo', 'Luciano Santos', 'Marcela Nunes', 'Victoria Viana', 'Maurício Junior']) assert.ok(html.includes(name))
  for (const href of ['/downloads/houston-manual.pdf', '17aiD4n0JrrqkoX5trT6Pcv2UtIqXhn0G', '1ObkxOQtCsQGK-pZ_eHkWoI6VmInbMYPw', '/en-us', '/pt-br']) assert.ok(html.includes(href))
  assert.ok(html.indexOf('id="play"') < html.indexOf('id="about"'))
  assert.match(html, /application\/ld\+json/)
  assert.match(html, /property="og:title"/)
  assert.ok(html.includes(indexable ? 'index, follow' : 'noindex, nofollow'))
  if (siteUrl) {
    assert.ok(html.includes(`rel="canonical" href="${siteUrl}/${locale}"`))
    assert.ok(html.includes('hreflang="en-US"'))
    assert.ok(html.includes('hreflang="pt-BR"'))
    assert.ok(html.includes('hreflang="x-default"'))
  } else assert.ok(!html.includes('rel="canonical"'))
}
await access(new URL('downloads/houston-manual.pdf', root))
const robots = await readFile(new URL('robots.txt', root), 'utf8')
assert.ok(robots.includes(indexable ? 'Allow: /' : 'Disallow: /'))
if (indexable) {
  const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8')
  assert.ok(sitemap.includes(`${siteUrl}/en-us`))
  assert.ok(sitemap.includes(`${siteUrl}/pt-br`))
  assert.ok(sitemap.includes('xhtml:link'))
}
console.log('PASS: English/Portuguese prerendered content, locale metadata, language links, downloads and indexing.')


if (gameUrl === '/game/latest/index.html') {
  await assert.rejects(access(new URL('game/', root)), { code: 'ENOENT' })
  const routes = JSON.parse(await readFile(new URL('_routes.json', root), 'utf8'))
  assert.ok(routes.include.includes('/game/*'), 'Game Function must be enabled')
  console.log('PASS: latest-only R2 game URL; game assets excluded from Pages; game Function enabled.')
}