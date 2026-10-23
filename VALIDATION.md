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
- The browser game is connected locally at /game/index.html. Hosting the game remains pending by user choice: Build/web.data.br is 49.4 MiB, above the Cloudflare Pages 25 MiB per-file limit.
- npm run build:local explicitly allows this local preview; the normal build retains its deployment size check and rejects this oversized asset.

## Local game integration - 2026-10-23

- Copied output2/web from the original Unity project into public/game. Copied build assets were verified against the source with SHA-256; the original export was not modified.
- Added responsive embedding styles and Brotli content headers for the compressed Unity data, framework and WebAssembly files.
- TypeScript checks, all eight automated tests, local static generation and generated-output checks passed.
- Browser checks loaded the game menu, manual and controller cockpit with its countdown. Fullscreen was verified with automatic iframe focus.
- The game logs: "Menu music loop start must be inside the clip." Audio behavior and complete cooperative gameplay have not been validated.
- Restart an already-running development server to reload the default game URL configuration.

A pattern-based source scan cannot guarantee that every possible sensitive value is absent.
