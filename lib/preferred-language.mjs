/**
 * Pick the first supported browser preference, respecting Accept-Language weights.
 * No IP/country lookup, cookies or client-side detection.
 */
export function preferredLanguagePath(header = '') {
  const preferences = header.split(',').map((entry, order) => {
    const [rawTag = '', ...parameters] = entry.trim().split(';')
    const weight = parameters.find(value => value.trim().toLowerCase().startsWith('q='))
    const quality = weight ? Number(weight.trim().slice(2)) : 1
    return { tag: rawTag.trim().toLowerCase(), quality, order }
  }).filter(item => item.tag && Number.isFinite(item.quality) && item.quality > 0 && item.quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.order - b.order)

  for (const { tag } of preferences) {
    if (tag === 'pt' || tag.startsWith('pt-')) return '/pt-br'
    if (tag === 'en' || tag.startsWith('en-')) return '/en-us'
  }
  return '/en-us'
}

