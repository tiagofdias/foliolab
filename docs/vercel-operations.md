# Running Folio Lab on Vercel Hobby

Checked 1 November 2026. This setup is appropriate for a personal, non-commercial portfolio project within the included allowances. It is not an uptime guarantee or an always-running market-data collector.

## Does it sleep? Do I need cron?

No keep-alive cron is required. The frontend is served from the CDN, and API functions run on demand. Idle function instances can be paused or replaced, so a later request can incur a cold start. There is no Render-style requirement to ping the app every 15 minutes. Turso keeps accounts and saved portfolios outside the function instance.

Prices and historical data are requested when someone uses the app. A background cron is only needed for a feature that must run without visitors, such as a scheduled digest or daily snapshot collection. No such cron is configured. An uptime monitor may check health to detect failures, but it cannot guarantee availability or repair configuration mistakes.

## Current Hobby allowances

| Resource | Included allowance / limit |
| --- | --- |
| Active function CPU | 4 CPU-hours per month |
| Provisioned function memory | 360 GB-hours per month |
| Function invocations | 1 million per month |
| Fast data transfer | 100 GB per month |
| Fast origin transfer | 10 GB per month |
| CDN requests | 1 million per month |
| Maximum function execution | 300 seconds per invocation |
| Runtime log retention | 1 hour |
| Deployments | 100 per day |
| Cron jobs | Up to 100 per project; each runs at most once a day, with imprecise timing |

CPU hours measure active code execution, not hours spent using the site. Waiting for a data provider does not consume active CPU time, but an outstanding request still consumes provisioned memory allowance. Streams reconnecting every four minutes avoid the per-invocation duration limit; they do **not** reset monthly quotas.

For scale: one continuously occupied 2 GB function instance consumes approximately 2 GB-hours per elapsed hour, so 360 GB-hours corresponds to about 180 instance-hours before accounting for other API work. Fluid concurrency can share instances across requests, while scaling can create more instances. This is an illustration, not a user-count or uptime guarantee. Avoid leaving live-feed tabs open continuously and monitor actual Usage rather than assuming one million invocations is the only relevant limit.

Vercel can restrict affected features when Hobby allowances are exceeded; its docs say most usage limits require waiting until 30 days have passed. Turso and the upstream market providers have separate quotas and availability. A healthy host does not guarantee a healthy data provider.

Sources: [Hobby allowances and restrictions](https://vercel.com/docs/plans/hobby), [Fluid compute resource accounting](https://vercel.com/docs/functions/usage-and-pricing), [Cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Diagnosing database startup failures

The URL and token are separate environment values:

```text
TURSO_DATABASE_URL=libsql://your-database-your-org.turso.io
TURSO_AUTH_TOKEN=your-private-database-token
```

If the token is accidentally pasted into the URL field, the API returns a safe `DATABASE_CONFIGURATION` error. It never includes the supplied credential in that response or its application error log. The frontend also handles non-JSON platform failures without showing a JSON parsing exception.

After changing Vercel environment values, redeploy. A changed value does not repair an already-running deployment. `/api/health` must return HTTP 200 with `{"ok":true}` before diagnosing login credentials. Revoke any token that was exposed and use a replacement only in the token field.
