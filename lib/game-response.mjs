export async function gameResponse({ request, env }) {
  const fail = (message, status) => new Response(message, { status, headers: { 'Cache-Control': 'no-store' } })
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
  let path
  try { path = decodeURIComponent(new URL(request.url).pathname) } catch { return fail('Not found', 404) }
  if (!/^\/game\/latest\/[a-zA-Z0-9_./ -]+$/.test(path)
      || path.split('/').slice(1).some(part => part === '.' || part === '..' || !part)) return fail('Not found', 404)
  if (!env.GAME_BUCKET) return fail('Game storage unavailable', 503)
  try {
    const key = path.slice(1)
    const object = await env.GAME_BUCKET[request.method === 'HEAD' ? 'head' : 'get'](key)
    if (!object) return fail('Not found', 404)
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('ETag', object.httpEtag)
    headers.set('Cache-Control', 'no-cache')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'SAMEORIGIN')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    headers.set('X-Robots-Tag', 'noindex')
    const tags = request.headers.get('If-None-Match')?.split(',').map(tag => tag.trim().replace(/^W\//, ''))
    if (tags?.includes(object.httpEtag) || tags?.includes('*')) return new Response(null, { status: 304, headers })
    headers.set('Content-Length', String(object.size))
    // R2 stores the original Brotli bytes; Workers must not compress them again.
    return new Response(request.method === 'HEAD' ? null : object.body, { headers, encodeBody: 'manual' })
  } catch {
    return fail('Game storage unavailable', 503)
  }
}
