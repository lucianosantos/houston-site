# Deploying Houston with Cloudflare Workers and R2

The website uses **Workers Static Assets**, not legacy Pages.
The game export stays committed in `public/game/`. The production build uploads it to the private `firefly-houston` bucket and excludes `dist/game/` from static assets.

## Cloudflare Git integration

Connect the repository to a Worker named **houston-site** and configure:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview command | `npx wrangler preview` (unused while preview builds are disabled) |
| Production branch | `main` |
| Root directory | Empty when package.json is at the repository root |
| Node version | `22.22.0` |
| Automatic preview builds | Disabled |

The output directory is configured as `dist` in `wrangler.toml`; no Pages output-directory setting is needed.
Keep the Worker name in the dashboard equal to `name` in `wrangler.toml`.

In **Workers Builds build variables/secrets**, configure:

| Variable | Value | Secret? |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID containing the bucket and Worker | No; may be encrypted |
| `R2_BUCKET_NAME` | `firefly-houston` | No |
| `R2_ACCESS_KEY_ID` | R2 S3 API access key ID | Yes |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API secret access key | Yes |
| `PRODUCTION_BRANCH` | `main` | No |
| `SITE_INDEXABLE` | `false` until the production URL is chosen | No |
| `NUXT_PUBLIC_SITE_URL` | Leave unset until a production URL is chosen | No |

Generate an **R2** API token with **Object Read & Write** access restricted to `firefly-houston`. It must allow listing, reading, writing and deleting objects.
Copy its S3 Access Key ID and Secret Access Key into the corresponding build secrets. They are separate from the deployment API token that Workers Builds creates or uses.
The deployment API token needs permission to deploy the Worker and use its R2 binding in this account.

The S3 script uses the account's standard global endpoint. A jurisdiction-specific bucket would need a corresponding endpoint change.
Do not set `NUXT_PUBLIC_GAME_URL` for deployment: the build sets `/game/latest/index.html` automatically.

The bucket can remain private; no public R2 URL, custom domain or CORS configuration is needed.
`wrangler.toml` declares the `GAME_BUCKET` runtime binding. The build upload credentials are not required by the running Worker.
The exported game is publicly readable through the website's `/game/latest/...` route.

Cloudflare supplies a workers.dev address after deployment when the account's workers.dev subdomain is configured.
Keep indexing disabled initially. When the final URL is confirmed, set `NUXT_PUBLIC_SITE_URL` and `SITE_INDEXABLE=true`, then rebuild.

## Runtime routing

- `/`: the Worker reads Accept-Language and redirects to English or Portuguese, preserving query parameters.
- `/game/*`: the Worker serves only the latest game's managed paths from R2, with Brotli/MIME metadata, ETags and cache revalidation.
- Other paths: Workers Static Assets serves `dist`, including localized pages, downloads, artwork and genuine 404 responses.

Selective `run_worker_first` routing ensures that the root's generated index.html does not bypass language selection.
The standard `_headers` and `_redirects` files configure static responses. The obsolete Pages `functions/` entry points and `_routes.json` are removed.
`public/.assetsignore` also excludes game assets from Workers uploads as defense in depth.

## Build pipeline

1. Validate credentials, the production branch and the committed game export.
2. Generate the static Nuxt site using the fixed latest-game URL.
3. Remove only `dist/game/`; validate localized output, SEO and the 25 MiB static-asset limit.
4. Run `wrangler deploy --dry-run` to validate and bundle the Worker before changing R2.
5. Upload changed game assets to `game/latest/`. Reuse matching objects and upload index.html last.
6. After successful uploads, remove stale objects in `game/latest/` and any previous `game/releases/<sha256>/` objects. Other bucket paths are untouched.
7. Workers Builds runs the deploy command to publish the Worker and static assets.

Only the latest exported game is hosted. Hashes identify unchanged files; they do not create versioned game directories. History remains in Git.
The build uses `WORKERS_CI_BRANCH` (Cloudflare) or `DEPLOY_BRANCH` (manual CI) to prevent non-production branches from overwriting the shared game.

Fixed-path replacement is not atomic. An interrupted upload can leave the live game partially updated; retry the deployment. Players loading during updates may need to reload.
R2 changes take effect before Worker deployment. Rolling back only the Worker does not restore the game; redeploy the corresponding Git revision.

Use one deployment path, and avoid overlapping Cloudflare/local uploads.
The Worker still has platform-managed deployment versions, but this pipeline does not retain multiple game builds in R2.
Worker requests and R2 reads may incur usage charges. No edge cache is configured by this implementation.

## GitHub Actions alternative

The manual **Deploy Cloudflare Worker** workflow runs the same production pipeline. Configure repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_API_TOKEN`: permission to deploy Workers and attach the account's R2 binding.

Optional repository variables: `NUXT_PUBLIC_SITE_URL`, `SITE_INDEXABLE`, `NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
Run the workflow on the production branch. The shared concurrency group serializes manual deployments.
Do not also enable a second automatic deployment path for the same branch.

## Validation and local play

`npm run check` runs type checks, tests, static generation, output checks and Wrangler's deployment dry run without uploading to R2 or deploying.
Do not deploy that output directly: it has not synchronized the game's files to R2.

For actual local gameplay, use `npm run dev` or `npm run build:local && npm run preview`.
These keep the game local. The simple preview server shares the Worker's browser-language redirect handler, but serves the game from local files.

`npm run build` requires deployment credentials and writes to R2; it does not itself publish the Worker.
`npm run deploy` publishes the Worker and static assets already built. In Workers Builds, keep build and deploy as the separate commands above.
Never commit secret values or prefix them with `NUXT_PUBLIC_`.

Reference: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [R2 credentials](https://developers.cloudflare.com/r2/api/tokens/).
