export function getSiteSettings(env = process.env) {
  const input = (env.NUXT_PUBLIC_SITE_URL || '').trim()
  let siteUrl = ''
  if (input) {
    const url = new URL(input)
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('NUXT_PUBLIC_SITE_URL must be an HTTPS origin without a path, credentials, query or hash.')
    }
    siteUrl = url.origin
  }
  const requested = env.SITE_INDEXABLE === 'true'
  if (requested && !siteUrl) throw new Error('Set NUXT_PUBLIC_SITE_URL before enabling SITE_INDEXABLE.')
  const branch = env.WORKERS_CI_BRANCH || env.DEPLOY_BRANCH
  const productionBranch = env.PRODUCTION_BRANCH || 'main'
  const indexable = Boolean(requested && siteUrl && (!branch || branch === productionBranch))
  const gameUrl = (env.NUXT_PUBLIC_GAME_URL || '').trim() || '/game/index.html'
  if (gameUrl && !(/^\/(?!\/)/.test(gameUrl) || /^https:\/\//.test(gameUrl))) {
    throw new Error('NUXT_PUBLIC_GAME_URL must be an absolute site path or HTTPS URL.')
  }
  return { siteUrl, indexable, gameUrl }
}

