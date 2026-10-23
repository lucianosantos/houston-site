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

On Cloudflare Pages, a root-only Pages Function reads the browser Accept-Language header: Portuguese preferences go to /pt-br, English preferences go to /en-us, and unsupported or missing languages fall back to English. Browser preference weights are respected. This does not use IP location. Explicit localized URLs are never automatically redirected. The static root remains an English fallback outside Cloudflare. The header’s EN/PT switch changes the website language and preserves the current section anchor. Every route is prerendered with its localized content and metadata, so direct links work without JavaScript.

The game title stays in English. The current game build and downloadable manual are also in English; translating the website does not translate these assets.

## Technology

- Nuxt 4 and Vue 3
- TypeScript with strict checks
- Plain CSS with shared design tokens
- Nitro static generation
- Cloudflare Pages

The content is statically generated. A small Cloudflare Pages Function redirects only the root URL based on browser language; localized pages and assets remain static. No application server, database, account system or CMS is required.

## Requirements and local development

Use Node.js 22.22.0 or a compatible newer version. The target version is recorded in `.node-version` and `.nvmrc`.

```sh
npm ci
npm run dev
```

For a production build and local preview:

```sh
npm run build
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
functions/          Root browser-language redirect for Cloudflare Pages
lib/                Browser-language preference selection
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

The browser build is not included yet. The site displays a clear availability message and keeps the start button disabled until a game URL is configured. Windows and Mobile downloads remain available.

To enable browser play:

1. Export and test a Unity Web build.
2. Copy its complete generated structure to `public/game/`.
3. Set `NUXT_PUBLIC_GAME_URL=/game/index.html`.
4. Rebuild the site.
5. Verify loading, audio, controls, fullscreen and a complete session in both roles.

An externally hosted HTTPS game URL is also supported if that host permits iframe embedding. The game loads only after the visitor clicks Start. Role selection stays inside the game; communication uses the players’ own voice call.

Cloudflare Pages limits individual static files to 25 MiB. The build checks this limit. Large Unity data files may need separate hosting. Compression headers must match the exported build.

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
| `NUXT_PUBLIC_GAME_URL` | Browser game path or HTTPS URL |
| `NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional Search Console verification token |

Rebuild after changing these values.

You do not need a custom domain to deploy. Cloudflare Pages supplies a project-based pages.dev address after a successful deployment. Leave NUXT_PUBLIC_SITE_URL empty and SITE_INDEXABLE=false for the first deployment; the website still works, with indexing disabled and no canonical/sitemap URLs. Set the confirmed Pages address or a custom domain later and rebuild when ready for indexing.

## SEO

Both language pages include localized titles, descriptions, HTML language attributes, Open Graph/Twitter metadata and structured data.

The production domain has not been selected. Until then, builds emit `noindex, nofollow`, a matching HTTP header and restrictive robots rules. No placeholder canonical or sitemap is published.

When the domain is ready:

1. Set `NUXT_PUBLIC_SITE_URL` to its HTTPS origin.
2. Set `SITE_INDEXABLE=true` for production.
3. Rebuild and deploy.

The build then includes localized canonical URLs, reciprocal `hreflang` links, absolute social image URLs and a sitemap for English and Portuguese. On Cloudflare the root redirects by browser language; its static fallback is English and canonicalized to `/en-us`. Preview branches remain non-indexable.

## Cloudflare deployment

Create a Cloudflare Pages project using:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production branch | `main` |
| Root directory | This project’s directory |
| Node version | `22.22.0` |

Set the build variables above in Cloudflare. Keep indexing disabled for preview builds. `wrangler.toml` declares the Pages project name `houston-site`; change it if using another name.

For manual GitHub Actions deployment, configure repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, then run the deployment workflow with the desired branch. Build variables can be configured as repository variables. Workflows assume this directory is the repository root.

Use one normal deployment path—Cloudflare Git integration or the manual workflow—to avoid duplicate deployments. Optional Cloudflare Web Analytics can be enabled in the dashboard.

No Cloudflare deployment or domain configuration has been performed yet. Create a Pages project (not a Workers application) named `houston-site` and connect `github.com/lucianosantos/houston-site`. If this project is at the repository root, leave Root directory blank. If the repository contains both game/ and site/, use `site` as the Root directory. Keep `functions/` beside `package.json`, not inside public/ or dist/. The `public/_routes.json` file restricts function execution to /. Git integration builds the function automatically. No GitHub Actions API secrets are needed for Cloudflare Git integration.

## Validation

```sh
npm run check
node scripts/check-output.mjs
```

Checks cover TypeScript, configuration behavior, static generation, localized output, metadata, gameplay order, downloads and indexing rules.

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

