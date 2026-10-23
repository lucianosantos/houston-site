import { preferredLanguagePath } from './preferred-language.mjs'

// The Worker invokes this handler only for the root route.
export function languageResponse({ request }) {
  const source = new URL(request.url)
  const destination = new URL(preferredLanguagePath(request.headers.get('Accept-Language') || ''), source.origin)
  destination.search = source.search

  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.href,
      'Cache-Control': 'no-store',
      Vary: 'Accept-Language',
      'X-Robots-Tag': 'noindex, follow',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })
}

