import { languageResponse } from '../lib/language-response.mjs'
import { gameResponse } from '../lib/game-response.mjs'

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname
    if (path === '/') {
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } })
      }
      return languageResponse({ request })
    }
    if (path.startsWith('/game/')) return gameResponse({ request, env })
    return env.ASSETS.fetch(request)
  }
}
