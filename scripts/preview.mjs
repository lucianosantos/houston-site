import http from 'node:http'
import { onRequest } from '../functions/index.js'
import { readFile } from 'node:fs/promises'
import { dirname, resolve, extname, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' }
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (pathname === '/') {
      const request = new Request('http://127.0.0.1:4173' + req.url, {
        headers: { 'Accept-Language': req.headers['accept-language'] || '' }
      })
      const response = onRequest({ request })
      res.writeHead(response.status, Object.fromEntries(response.headers)).end()
      return
    }
    const path = resolve(root, '.' + pathname)
    const withinRoot = relative(root, path)
    if (withinRoot.startsWith('..') || isAbsolute(withinRoot)) { res.writeHead(403).end(); return }
    const body = await readFile(path).catch(error => {
      if (!extname(path)) return readFile(path + '.html')
      throw error
    })
    const compressed = path.endsWith('.br')
    const underlyingPath = compressed ? path.slice(0, -3) : path
    const contentType = types[extname(underlyingPath)] || (extname(underlyingPath) ? 'application/octet-stream' : 'text/html; charset=utf-8')
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': body.length,
      ...(compressed ? { 'Content-Encoding': 'br' } : {})
    }).end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' }).end(await readFile(resolve(root, '404.html')).catch(() => 'Not found'))
  }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'))

