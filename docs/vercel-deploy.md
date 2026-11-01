# Deploy on Vercel Hobby with Turso

For cold starts, daily operation, cron jobs and quota details, see [Vercel operations](vercel-operations.md).

This is the alternative to Render for the personal, non-commercial Folio Lab project. Choose **Hobby**, not a Pro trial. Vercel's Hobby plan is free within its included quotas. No paid Vercel database, storage, Marketplace integration or add-on is required. Account verification requirements remain controlled by the host.

## Deploy

1. Sign in to [Vercel](https://vercel.com/new) with GitHub and choose **Add New / Project**.
2. Import the existing `tiagofdias/foliolab` repository and select `main`. Do not create a duplicate repository.
3. Keep the root directory empty (`./`) and use Node **24.x**. The committed `vercel.json` configures Vite, the build command and the API function.
4. Under **Environment Variables**, enter these two server-side values for Production (and Preview if wanted):

   | Variable | Value |
   | --- | --- |
   | `TURSO_DATABASE_URL` | Your existing `libsql://...turso.io` database URL |
   | `TURSO_AUTH_TOKEN` | A fresh token for that same database |

   Never prefix these with `VITE_`. Never commit or paste the token into chat. If a token has been shared, revoke it and generate a replacement first.

5. Click **Deploy** and open the assigned HTTPS URL. `/api/health` should return `{"ok":true}`. Register an account, save a portfolio and reload to verify persistence.

Vercel automatically defines `VERCEL`; when present the API refuses local SQLite fallback and requires the remote database. You do not need Render's `HOST`, `PORT` or `REQUIRE_REMOTE_DB` variables. Vercel supplies production mode for secure session cookies.

## How this deployment works

- React files are built into `dist` and served by the CDN. Client routes fall back to `index.html`.
- `/api/*` requests use one Node function in `api/index.mjs`, which calls the same application handler as the local Node server. Account ownership, transactions and all analysis remain in the same application.
- Accounts, sessions and workspaces persist in Turso. Only replaceable market-directory caches use the function's temporary filesystem. No portfolio database is written there.
- Crypto updates use Server-Sent Events with an outbound Coinbase connection. Vercel functions have a finite duration: the API ends each stream after four minutes, before the configured five-minute limit, and the browser reconnects automatically. This is not an always-running background worker; no prices are collected while nobody is connected.
- Caches and connection pools are per function instance and can disappear between invocations. Free compute, bandwidth and request quotas still apply; continuous streams consume those allowances. Keep this hobby deployment within the included limits.

## Verification boundary

The repository includes schema-validated Vercel configuration and local checks for the function adapter, parsed request bodies, authenticated workspace persistence, temporary-cache paths and application browser flows. A live Vercel/Turso deployment requires the owner's accounts and replacement credentials; it has not been provisioned from this workspace.

Official references: [Hobby plan](https://vercel.com/docs/plans/hobby), [Node functions](https://vercel.com/docs/functions/runtimes/node-js), [function duration](https://vercel.com/docs/functions/configuring-functions/duration).
