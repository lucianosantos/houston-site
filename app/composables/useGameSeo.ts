import { game } from '~/data/site-content'

export function useGameSeo() {
  const config = useRuntimeConfig().public
  const { locale, copy } = useSiteLocale()
  const canonical = () => config.siteUrl ? `${config.siteUrl}/${locale.value}` : undefined
  const image = () => config.siteUrl ? new URL(game.poster, config.siteUrl).href : undefined

  useSeoMeta({
    title: () => copy.value.seoTitle,
    description: () => copy.value.description,
    robots: () => config.indexable ? 'index, follow' : 'noindex, nofollow',
    ogTitle: game.name,
    ogDescription: () => copy.value.description,
    ogType: 'website',
    ogSiteName: game.name,
    ogLocale: () => copy.value.ogLocale,
    ogUrl: canonical,
    ogImage: image,
    ogImageWidth: () => image() ? game.posterWidth : undefined,
    ogImageHeight: () => image() ? game.posterHeight : undefined,
    ogImageAlt: () => image() ? copy.value.imageAlt : undefined,
    twitterCard: 'summary_large_image',
    twitterTitle: game.name,
    twitterDescription: () => copy.value.description,
    twitterImage: image
  })
  useHead(() => ({
    htmlAttrs: { lang: copy.value.htmlLang },
    link: config.siteUrl ? [
      { rel: 'canonical', href: canonical()! },
      { rel: 'alternate', hreflang: 'en-US', href: `${config.siteUrl}/en-us` },
      { rel: 'alternate', hreflang: 'pt-BR', href: `${config.siteUrl}/pt-br` },
      { rel: 'alternate', hreflang: 'x-default', href: `${config.siteUrl}/` }
    ] : [],
    meta: [{ property: 'og:locale:alternate', content: locale.value === 'en-us' ? 'pt_BR' : 'en_US' }],
    script: [{
      key: 'game-structured-data',
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: copy.value.seoTitle,
        description: copy.value.description,
        inLanguage: copy.value.htmlLang,
        ...(canonical() ? { url: canonical(), image: image() } : {}),
        about: {
          '@type': 'VideoGame',
          name: game.name,
          description: copy.value.description,
          inLanguage: 'en',
          genre: 'Puzzle',
          playMode: 'CoOp',
          numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 2 },
          author: { '@type': 'Organization', name: game.studio }
        }
      }).replace(/</g, '\\u003c')
    }]
  }))
}

