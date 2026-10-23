# Deploying Houston with Cloudflare Pages and R2

The game export stays committed in `public/game/`. Never manually remove it from GitHub.
The Pages build uploads it to the private `firefly-houston` bucket and removes only the generated `dist/game/` copy.

## Automatic Cloudflare Git integration (recommended)

Create a **Pages** project connected to this repository. Use:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Root directory | Empty when package.json is at the repository root |
| Production branch | `main` |
| Node version | `22.22.0` |

In the Pages project build environment, configure the following for **Production**. Disable Cloudflare preview deployments for this project: only the production branch may overwrite the shared latest game. Pull requests still run credential-free CI validation:

| Variable | Value | Secret? |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID of the account containing the bucket | No; may be encrypted |
| `R2_BUCKET_NAME` | `firefly-houston` | No |
| `R2_ACCESS_KEY_ID` | R2 S3 API access key ID | Yes, encrypted |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API secret access key | Yes, encrypted |
| `SITE_INDEXABLE` | `false` until the production URL is chosen | No |
| `NUXT_PUBLIC_SITE_URL` | Leave unset until a production URL is chosen | No |

Generate an R2 API token with **Object Read & Write** access restricted to `firefly-houston`.
Save its S3 Access Key ID and Secret Access Key in the build environment. These are **not** the general Cloudflare API token.
The upload script uses the account's standard global S3 endpoint. A jurisdiction-specific bucket would need a corresponding endpoint change.

Do not set `NUXT_PUBLIC_GAME_URL` for deployments: the deployment build uses the fixed same-origin URL /game/latest/index.html.
The existing `wrangler.toml` binds `GAME_BUCKET` to `firefly-houston`. Both the bucket and Pages project must be in the same Cloudflare account.
The bucket can remain private; no public R2 URL, custom domain or CORS configuration is needed.
The game files are intentionally publicly readable through the website's `/game/latest/...` route.

Once committed and pushed, Cloudflare Git integration runs the pipeline on each configured deployment.
Do not also enable a second automatic GitHub deploy for the same branch.

## What the pipeline does

1. Validates credentials, the production branch and the committed game export.
2. Generates the website with the fixed /game/latest/index.html game URL.
3. Removes only dist/game, then validates localized output, routing, SEO and the Pages file-size limit before changing R2.
4. Uploads changed game assets to game/latest/, preserving Brotli and MIME metadata. Matching files are reused; changed files overwrite the same object keys. The HTML entry point is uploaded last.
5. After all uploads succeed, deletes stale objects from game/latest/ and objects under the previous game/releases/<sha256>/ scheme, if any exist. Unrelated bucket paths are not deleted. Listing/deletion failures stop the build.
6. Pages deploys the remaining website and its Functions.

Only the latest exported game is hosted. History remains in Git; no content-versioned directories are created in R2. The hashes identify unchanged files for upload reuse only.
The Function and stored objects use Cache-Control: no-cache with ETags, so browsers revalidate files instead of keeping an immutable older build.

A failed upload can leave the live game partially updated: replacing several objects is not atomic. Retrying completes the update; a player loading during deployment may need to reload. Updating R2 takes effect before the new Pages deployment and cannot be rolled back by a Pages rollback alone. To restore an older game, deploy the corresponding Git revision.
Use only one deployment path and avoid overlapping Cloudflare/local uploads. GitHub Actions uses a shared concurrency group for this bucket.


The Pages Function streams R2 objects with their metadata, ETags and browser cache headers. It handles GET, HEAD and conditional requests.
Its requests count as Pages Functions/Workers usage and R2 reads; this is not a guarantee of free hosting.
A future custom domain and CDN cache can reduce storage reads. No edge cache is configured by this implementation.

## GitHub Actions deployment (alternative)

The manual **Deploy Cloudflare Pages** workflow runs the same upload/build pipeline.
Configure repository **Secrets**:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_API_TOKEN`: token allowed to deploy Cloudflare Pages in this account.

Optional repository **Variables**: `NUXT_PUBLIC_SITE_URL`, `SITE_INDEXABLE`, `NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
Run the workflow with the production branch (main by default). Other branches are rejected before upload.
Its upload and the Pages binding always use `firefly-houston`.

## Validation and local development

`npm run check` runs type checks, tests and a deployment-shaped **dry run**.
The dry run excludes the generated game files and validates the Pages output without credentials, network upload or deployment.
It is intended for pull-request validation; do not deploy its output because it has not uploaded the committed game to R2.

For actual local play, use `npm run dev`, or `npm run build:local && npm run preview`.
Those commands keep the game local and do not upload to R2.

`npm run build` requires deploy credentials and writes to R2. It does not itself publish Pages.
No credential values are embedded in public runtime configuration. Never prefix a secret with `NUXT_PUBLIC_`, commit `.env`, or paste secret values into documentation.
