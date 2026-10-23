# Houston website validation

## Current checks

- Strict TypeScript checks, eight configuration/routing tests and static generation passed during implementation.
- English and Portuguese output, localized metadata, download links, manual, and indexing rules passed generated-output checks.
- Browser-language redirection compiled successfully with Wrangler Pages Functions.
- Browser checks covered language switching, translated content, responsive layout and fullscreen controls.

## Repository review - 2026-10-23

- No real credentials found by a targeted scan of files Git would include. The credential-like URL in tests is deliberately fake test input.
- The local historical archive is excluded from Git and is not deployed.
- Dependency folders, generated output, environment files and logs are ignored; .env.example contains empty/default settings only.
- Runtime configuration uses Houston project names. No previous-project branding was found in the files prepared for Git after cleanup.
- The manual and contact/download links are intentionally public site content.

## Deployment state

- The local repository contains the initial project commit. No code was committed or pushed by this integration.
- No deployment was performed. Cloudflare project creation and a successful remote build remain unverified.
- Production URL remains optional while SITE_INDEXABLE=false. Default builds omit canonical/sitemap URLs and remain noindex.
- The browser game remains available locally at /game/index.html. The deployment pipeline now uploads only the latest game assets to R2, excluding them from Pages output. Remote upload and deployment are unverified until credentials are configured.
- npm run build:local retains local game files. npm run build uploads them to R2 before validating the remaining Pages output; npm run check uses a credential-free dry run.

## Local game integration - 2026-10-23

- Copied output2/web from the original Unity project into public/game. Copied build assets were verified against the source with SHA-256; the original export was not modified.
- Added responsive embedding styles and Brotli content headers for the compressed Unity data, framework and WebAssembly files.
- TypeScript checks, all eight automated tests, local static generation and generated-output checks passed.
- Browser checks loaded the game menu, manual and controller cockpit with its countdown. Fullscreen was verified with automatic iframe focus.
- The game logs: "Menu music loop start must be inside the clip." Audio behavior and complete cooperative gameplay have not been validated.
- Restart an already-running development server to reload the default game URL configuration.

A pattern-based source scan cannot guarantee that every possible sensitive value is absent.

## R2 deployment pipeline - 2026-10-23

- Game sources remain tracked under public/game. The real deployment build requires R2 credentials; no upload or deployment was performed here.
- TypeScript checks and all 14 tests passed, covering content hashing, missing credentials, upload metadata, unchanged asset reuse, error propagation and GET/HEAD/conditional game delivery.
- A deployment-shaped dry run passed: localized output references a fixed /game/latest URL, dist/game is absent, game Function routing is enabled, and remaining assets pass the Pages size check.
- Wrangler compiled both Pages Functions successfully. A local Workers/Miniflare runtime check with local R2 confirmed the Brotli response bytes match the stored bytes and decompress correctly. Missing deploy credentials stop the real build before generation or upload.
- Production R2 access, binding permissions and end-to-end remote gameplay still require validation after configuring the documented environment variables.
## Latest-only R2 storage - 2026-10-23

- Deployments overwrite game/latest/ instead of accumulating content-versioned directories. Hashes only identify unchanged files.
- Upload completion precedes scoped stale-object cleanup, including any old game/releases/<sha256>/ objects. The actual bucket was not accessed or modified here.
- Cache-Control is no-cache with ETag revalidation. Preview branches cannot overwrite production. GitHub deployments share one concurrency group.
- Fixed-path updates are not atomic; interrupted updates may need a retry and open games may need to reload. Git retains the build history.
- Latest-only checks passed: TypeScript, all 15 tests, deployment-shaped static generation, Pages Functions compilation and local Workers/R2 Brotli smoke test.
