# Deploy Folio Lab on Render's free plan

The root `render.yaml` creates one free Node web service in Frankfurt. It builds the React frontend and serves both the frontend and API from the same origin. No paid Render resources or expiring Render Postgres instance are declared.

## Persistent database setup

Render's free filesystem is ephemeral: a local SQLite file disappears on restart, redeploy or spin-down. The Blueprint therefore requires a remote database and refuses to silently fall back to temporary account storage.

1. Create a free [Turso](https://turso.tech/pricing) account and a **libSQL** database. This integration uses the supported `@libsql/client` SDK; choose a libSQL database rather than a database requiring the newer Turso-only SDK.
2. Copy its connection URL and create a database auth token using the dashboard or [Turso CLI](https://docs.turso.tech/cli/introduction). Both must belong to the same database. Keep the token private.
3. Optionally, with the CLI: `turso db create foliolab`, `turso db show foliolab --url`, then `turso db tokens create foliolab`. If your dashboard/CLI offers an engine selector, choose libSQL. The application creates its tables automatically on startup.

## Render Blueprint

1. Open [Deploy to Render](https://dashboard.render.com/select-repo?type=blueprint&repo=https%3A%2F%2Fgithub.com%2Ftiagofdias%2Ffoliolab).
2. Connect GitHub and grant Render access to `tiagofdias/foliolab` if requested. Select `main` and the root `render.yaml`.
3. At the Blueprint prompt, enter `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. These are server secrets; do not use `VITE_` prefixes or commit them.
4. Confirm the service is on the **Free** instance plan and deploy. `/api/health` must return `{"ok":true}`. Open the service's assigned HTTPS URL, register an account and save a portfolio.
5. Restart the Render service, then sign in and confirm the portfolio remains. The remote database preserves accounts, sessions and workspaces across app restarts. Market-data caches are disposable and rebuild as needed.

The build command explicitly installs development dependencies so TypeScript and Vite remain available with `NODE_ENV=production`. The server binds to `0.0.0.0` and Render's assigned `PORT`; production session cookies are Secure and HttpOnly.

## Free-plan limits and existing data

- Render free web services sleep after 15 minutes without inbound traffic and have cold starts. Stream connections must reconnect after restarts. Monthly free-instance, bandwidth and build limits apply; remain within the free allowances. [Render free-plan documentation](https://render.com/docs/free).
- Turso has a free tier with storage/read/write quotas. Select the free plan and monitor usage; availability and quotas can change. [Current Turso pricing](https://turso.tech/pricing).
- Render Postgres is deliberately omitted because its free database expires after 30 days. A paid disk is also omitted.
- Existing local users and `data/folio.db` are **not uploaded to GitHub**. For personal portfolio data, export JSON from local Settings, register on the deployed app, then import the backup. Use a database migration/export if all existing accounts must move together; never upload the local database to the repository.
- This preparation does not create a Turso account, provision a database, connect a Render account or publish a running service. Those require the account owner to provide the two database secrets and submit the Blueprint.

Local development continues using Node SQLite without any external service. Environment variables are not automatically loaded from `.env`; set them in your shell or use `node --env-file=.env server/index.mjs` after preparing a private `.env` file.
