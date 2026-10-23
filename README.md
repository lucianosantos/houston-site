# Houston, We Have a Problem

A cooperative communication puzzle game by **Firefly Studio**.

Two players must repair a spacecraft before it collides with a planet. One operates the ship’s control panel; the other reads the manual and explains the instructions. They have different information, five systems to repair, and ten minutes to work together.

This project contains the game’s public website: browser play area, Windows and Mobile downloads, an instruction manual, and team contacts.

## Languages

The website is available in **English** and **Brazilian Portuguese**:

| Route | Language |
| --- | --- |
| `/` | Redirects using browser language; English fallback |
| `/en-us` | English |
| `/pt-br` | Português brasileiro |

On Cloudflare Workers, the root handler reads the browser Accept-Language header: Portuguese preferences go to /pt-br, English preferences go to /en-us, and unsupported or missing languages fall back to English. Browser preference weights are respected. This does not use IP location. Explicit localized URLs are never automatically redirected. The static root remains an English fallback outside Cloudflare. The header’s EN/PT switch changes the website language and preserves the current section anchor. Every route is prerendered with its localized content and metadata, so direct links work without JavaScript.

The game title stays in English. The current game build and downloadable manual are also in English; translating the website does not translate these assets.

## Technology

- Nuxt 4 and Vue 3
- TypeScript with strict checks
- Plain CSS with shared design tokens
- Nitro static generation
- Cloudflare Workers Static Assets and R2

The content is statically generated. A small Worker redirects the root URL based on browser language and streams game assets from R2. Localized pages and other assets remain static. No database, account system or CMS is required. The Worker provides the language redirect and game delivery.

## Requirements and local development

Use Node.js 22.22.0 or a compatible newer version. The target version is recorded in `.node-version` and `.nvmrc`.

```sh
npm ci
npm run dev
```

For a production build and local preview:

```sh
npm run build:local
npm run preview
```

The generated files are written to `dist/`. The production preview is available at `http://127.0.0.1:4173`; use HTTP rather than opening source files directly.

## Project structure

```text
app/
  assets/css/       Design tokens and component/layout styles
  components/       Page sections and language switcher
  composables/      Locale selection, SEO and fullscreen behavior
  data/             English/Portuguese copy, assets, links and team
  pages/            Default, English and Portuguese routes
public/
  images/           Game artwork and manual cover
  downloads/        Instruction manual PDF
  game/             Browser build assets
  _headers          Hosting, cache and download headers
  _redirects        URL redirects
worker/             Worker entry point and request routing
lib/                Language redirect and R2 response handlers
scripts/            Build configuration, SEO generation and output checks
tests/              Configuration tests
tools/              Manual PDF generator
.github/workflows/  Validation and Cloudflare deployment
```

## Content

Edit `app/data/site-content.ts` for both languages’ page copy, labels, accessibility text and SEO metadata. English defines the translation shape; TypeScript checks that Portuguese supplies every field.

Edit `app/data/site-links.ts` for platform downloads and team contacts. Names and contact addresses are shared between languages; role labels are translated.

All images and the manual are served locally from `public/`. The website does not depend on the Unity source at runtime.

## Browser game

The Web export is included in public/game and connected at /game/index.html. The visitor clicks Start game to load it inside the page. This copy comes from the game project's output2/web folder; the original export is unchanged.

### Local preview

Run npm run build:local followed by npm run preview. The local server sends the Content-Encoding: br and MIME headers required by this Brotli-compressed export. Its copied HTML shell uses embed.css to fill the website's game frame and hide Unity's duplicate outer footer.

### Cloudflare hosting

The game files remain committed in public/game. During deployment, npm run build validates the Workers static output with dist/game excluded, then overwrites the private firefly-houston bucket at game/latest/ and removes obsolete game files. Only the latest build is hosted; history stays in Git. The player uses a same-origin Worker handler at /game/latest/index.html with cache revalidation. No public bucket URL or custom domain is required.

See [Cloudflare deployment setup](docs/cloudflare-deployment.md) for build secrets, the GAME_BUCKET binding, Git integration, GitHub Actions and latest-only game hosting.

To replace the game, commit a complete new export in public/game, preserving the responsive shell and embed.css, then deploy. The deployment URL stays fixed at /game/latest/index.html. Test loading, audio, controls, fullscreen and both player roles after changing the export.


## Instruction manual

The downloadable PDF contains eight original two-page spreads, in English, and is approximately 13.9 MB. Its text is embedded in the artwork rather than selectable text.

To regenerate it after updating the source images:

```sh
python -m pip install reportlab Pillow pypdf
python tools/build-manual.py --source "path/to/Assets/Art/Manual"
```

The source directory must contain `P1.jpg` through `P8.jpg`. Update the cover image and displayed file size when necessary.

## Configuration

Copy `.env.example` to `.env` for local development. These settings are applied at build time:

| Variable | Purpose |
| --- | --- |
| `NUXT_PUBLIC_SITE_URL` | Production HTTPS origin; currently unset |
| `SITE_INDEXABLE` | Enable indexing only when the production domain is ready |
| `PRODUCTION_BRANCH` | Production branch; defaults to `main` |
| `NUXT_PUBLIC_GAME_URL` | Defaults to /game/index.html; can point to an external HTTPS build |
| `NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional Search Console verification token |

Rebuild after changing these values.

You do not need a custom domain to deploy. Cloudflare Workers supplies a workers.dev address after a successful deployment. Leave NUXT_PUBLIC_SITE_URL empty and SITE_INDEXABLE=false for the first deployment; the website still works, with indexing disabled and no canonical/sitemap URLs. Set the confirmed Worker address or a custom domain later and rebuild when ready for indexing.

## SEO

Both language pages include localized titles, descriptions, HTML language attributes, Open Graph/Twitter metadata and structured data.

The production domain has not been selected. Until then, builds emit `noindex, nofollow`, a matching HTTP header and restrictive robots rules. No placeholder canonical or sitemap is published.

When the domain is ready:

1. Set `NUXT_PUBLIC_SITE_URL` to its HTTPS origin.
2. Set `SITE_INDEXABLE=true` for production.
3. Rebuild and deploy.

The build then includes localized canonical URLs, reciprocal `hreflang` links, absolute social image URLs and a sitemap for English and Portuguese. On Cloudflare the root redirects by browser language; its static fallback is English and canonicalized to `/en-us`. Preview branches remain non-indexable.

## Cloudflare deployment

Use Cloudflare Workers Git integration with build command npm run build and deploy command npx wrangler deploy. Keep npx wrangler preview as the preview command, with automatic preview builds disabled. The Worker name is houston-site; wrangler.toml configures dist as its static asset directory and firefly-houston as its R2 bucket.

Required build settings are CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY; R2_BUCKET_NAME defaults to firefly-houston. Configure the two R2 keys as build secrets. Workers Builds handles deployment authentication separately.

Follow [the deployment guide](docs/cloudflare-deployment.md) for setup, token permissions and the alternative manual GitHub Actions workflow. Use one deployment path to avoid duplicate deployments.

Selective Worker routing handles / and /game/* before static assets. Other requests use the ASSETS binding. No remote deployment has been performed by this implementation.


## Validation

```sh
npm run typecheck
npm test
npm run build:local
node scripts/check-output.mjs
```

Checks cover TypeScript, configuration behavior, static generation, localized output, metadata, gameplay order, downloads and indexing rules. npm run check also validates a deployment-shaped dry run with the game excluded from Workers static output. It needs no upload credentials. npm run build performs the real R2 upload and fails if credentials are missing or upload fails.

The page layout is responsive. This does not certify the Unity build for mobile browsers; game compatibility requires testing the actual build.

## Team

| Name | Role |
| --- | --- |
| Jhonatan Brendo | 3D Art and Project Manager |
| Luciano Santos | Programming |
| Marcela Nunes | Game Design and 3D Art |
| Victoria Viana | 2D Artist and UI Design |
| Maurício Junior | Sound Design |

Contact links are configured in `app/data/site-links.ts`.

