# Included Unity Web build

Copied from the game project output2/web directory. Build and TemplateData files are original exports. The copied index.html includes embed.css to fit the parent website; the source export was not modified.

Use npm run build:local and npm run preview from the site project. Brotli files require Content-Encoding: br and their underlying MIME types.

web.data.br is 49.4 MiB and exceeds Cloudflare Pages' per-file limit. The deployment build uploads these committed files to private R2 storage at game/latest/, replacing the previous build and excludes dist/game from Pages. See ../../docs/cloudflare-deployment.md for setup.
