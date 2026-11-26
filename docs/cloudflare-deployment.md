# Cloudflare Workers and R2

The website uses Workers Static Assets (`dist`) and the private `firefly-houston` R2 bucket bound as `GAME_BUCKET`.

## Website deployment

- Production branch: `main`; Worker: `houston-site`.
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy`.
- Node: 22.22.0 (see .node-version).
- Disable automatic preview builds if not needed.
- Existing Workers Git integration or the manual GitHub Actions workflow deploys the website.
- Website builds do not read or upload game exports. R2 game contents are left untouched.
- `dist/game/` is removed before validation and deployment; `public/.assetsignore` also excludes `/game/`.
- The bucket stays private; no public bucket domain or CORS configuration is needed.

## Compile game builds from the site

On Windows, close Unity for this project before running:

    npm run build:game
    npm run build:game -- --copy

Both commands use PowerShell and launch Unity three times in sequence, with the saved Windows, Mobile and Web Build Profiles. They validate the project, profiles, installed modules and Editor lock before deleting the Unity project's entire `output/` folder. Builds are written to `output/Windows`, `output/Mobile` (APK) and `output/Web`. Unity caches in Library are retained; this is an output cleanup, not a full asset-cache reset.

`--copy` waits for all three builds to succeed, prepares the copies, and replaces this site's `public/game/` with clean `windows/`, `mobile/` and `web/` inputs. A failed build stops the sequence and leaves the existing site inputs untouched. Compilation does not publish anything. Logs are saved in `.game-publish/build-logs/`.

Optional `.env` variables:

- `UNITY_PROJECT_PATH`: Unity project directory. Defaults to `../../roguelike/GameJam2026` relative to the site.
- `UNITY_EDITOR_PATH`: Unity.exe. Defaults to the Unity Hub installation matching ProjectVersion.txt.

`npm run build:game -- --copy --dry-run` checks prerequisites and prints the plan without deleting, compiling or copying anything. Then use `npm run publish:game` separately to publish the prepared files to R2.

## Publish all three platforms locally

Place complete exports in this site repository:

    public/game/web/index.html
    public/game/web/Build/...
    public/game/web/TemplateData/...
    public/game/windows/Houston.exe
    public/game/windows/UnityPlayer.dll
    public/game/windows/Houston_Data/...
    public/game/mobile/your-build.apk

`public/game/` and `.game-publish/` are ignored by Git. Previously tracked exports are removed from the index without deleting local files. Old binaries remain in Git history; this change does not rewrite history.

Copy `.env.example` to `.env` and fill in:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=firefly-houston`

Use an R2 S3 API token with Object Read & Write permissions restricted to that bucket, including listing and deleting objects. These are upload credentials, distinct from the Worker deployment API token. Never commit `.env` or prefix secrets with `NUXT_PUBLIC_`.

Run:

    npm run publish:game -- --dry-run
    npm run publish:game

The first command validates all exports and produces a Windows ZIP without accessing R2. The second performs the upload. The command resolves paths from the site repository, independently of the Unity project or the terminal's working directory. It reads `.env` when invoked through npm from this repository.

Windows is zipped with all runtime files. Unity debug-only folders containing DoNotShip or BurstDebugInformation, and tempburstlibs, are excluded. Keep exactly one APK directly in mobile/. Web exports support both Web.* and web.* filenames. A generated copy of index.html receives the embedded-player stylesheet; source exports are not edited.

The uploader hashes files, skips matching objects, streams original bytes, uploads the Web index last and removes obsolete files only within managed paths after successful uploads. APK and ZIP objects are stored under `downloads/latest/`; Web under `game/latest/`. Downloads are uploaded before Web. Keep only one publisher running at a time.

Public fixed links (same origin as the website):

- `/game/latest/index.html`
- `/downloads/latest/houston-windows.zip`
- `/downloads/latest/houston-android.apk`

The Worker streams these paths from R2, revalidates caching and forces attachment downloads for APK/ZIP. URLs do not change when contents change. Deploy the new website and Worker once to enable the download routes; subsequent game updates need only the publisher command.

Uploads replace the latest files and are not atomic across platforms or Web files. If interrupted, retry the publisher. This setup keeps no previous game builds in R2 and cannot roll them back through a website-only rollback.

## Checks and local preview

`npm run check` runs type checks, tests, a website build, static output validation and Wrangler dry run without credentials, uploads or publishing. It also works when public/game is absent, as in a fresh CI checkout.

`npm run build:local && npm run preview` keeps local game files for preview. The preview server maps `/game/latest/` to `/game/web/` and sets Brotli headers.

Reference: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [R2 credentials](https://developers.cloudflare.com/r2/api/tokens/).
