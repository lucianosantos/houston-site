import { readFile, writeFile, rm, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSiteSettings } from './site-settings.mjs'

const { siteUrl, indexable } = getSiteSettings()
const dist = new URL('../dist/', import.meta.url)
const robots = indexable
  ? `User-agent: *\nAllow: /\nDisallow: /game/\nSitemap: ${siteUrl}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n'
await writeFile(new URL('robots.txt', dist), robots)
if (siteUrl && indexable) {
  const alternates = `<xhtml:link rel="alternate" hreflang="en-US" href="${siteUrl}/en-us"/><xhtml:link rel="alternate" hreflang="pt-BR" href="${siteUrl}/pt-br"/><xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/"/>`
  const urls = ['en-us', 'pt-br'].map(locale => `<url><loc>${siteUrl}/${locale}</loc>${alternates}</url>`).join('')
  await writeFile(new URL('sitemap.xml', dist),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>\n`)
} else {
  await rm(new URL('sitemap.xml', dist), { force: true })
}
const headersPath = new URL('_headers', dist)
let headers = await readFile(headersPath, 'utf8')
if (!indexable) headers = headers.replace('/*\n', '/*\n  X-Robots-Tag: noindex, nofollow\n')
await writeFile(headersPath, headers)
// Keep framework-generated fallback pages out of the index.
for (const fallback of ['200.html', '404.html']) {
  const url = new URL(fallback, dist)
  try {
    let html = await readFile(url, 'utf8')
    html = html.replace(/<meta[^>]+name="robots"[^>]*>/g, '')
    html = html.replace('</head>', '<meta name="robots" content="noindex, nofollow"></head>')
    await writeFile(url, html)
  } catch (error) { if (error.code !== 'ENOENT') throw error }
}
async function checkSizes(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await checkSizes(path)
    else if ((await stat(path)).size > 25 * 1024 * 1024) {
      throw new Error(`Cloudflare Pages asset exceeds 25 MiB: ${path}. Host oversized game files externally.`)
    }
  }
}
await checkSizes(fileURLToPath(dist))
console.log(`Static output ready. Search indexing: ${indexable ? 'enabled' : 'disabled'}.`)

