# Folio Lab

**Render alternative: [deploy on Vercel Hobby](https://vercel.com/new).** Import this repository and add your existing Turso database URL and a fresh database token. The frontend and API are configured together; no paid add-ons are needed. See the [Vercel setup guide](docs/vercel-deploy.md) for exact steps and stream/runtime limits.

The existing [Render Blueprint guide](docs/render-deploy.md) remains available, but Render may request a payment method during onboarding even with a free service selected. Local development still uses SQLite with no cloud account.

A free, self-hosted portfolio workspace with React, TypeScript, Chart.js and Node.js/SQLite. No paid dependency or subscription is required to run locally.

European ETF coverage has been expanded to official Xetra, London, Euronext, SIX, Nasdaq Nordic and Warsaw directories. The verified snapshot indexes **over 11,000 European ETF listings across 13 countries**, plus separate ETC/ETN/ETP categories. This is **not every European exchange or every ETF**. Open **European coverage** in asset search for connected venues, published delays and explicit gaps. See the [reproducible coverage audit](docs/european-etf-coverage.md).

Delayed quotes are now the accepted portfolio-data policy. Yahoo publishes 15-minute delays for Xetra and many continental venues, **20 minutes for London and Milan**, and **30 minutes for SIX**. Actual quote age can be longer. Published Nordic real-time schedules alone do not make our snapshot connection a verified live stream.

## Run

Requires **Node.js 24** (uses built-in `node:sqlite`).

```sh
npm install
npm run dev
```

Open http://localhost:5173. This starts Vite and the API on port 3001. Register an account or select **Explore the interactive demo**. Demo prices are illustrative and changes exist only in memory.

The demo also offers **Use live market data**: its sample transactions remain fictional, while quotes and FX come from the same providers used by accounts. Returning to illustrative prices closes the live connection. Asset discovery always searches real metadata, including in demo mode.

To run the production build locally:

```sh
npm run build
npm start
```

Open http://localhost:3001. The Node server serves both the compiled frontend and API. `npm run preview` serves only static assets and is not the full application.

## Features

- Registration, login, logout, scrypt password hashing, seven-day HttpOnly sessions and authentication throttling.
- Per-user portfolios in SQLite; isolated demo mode.
- Portfolio create, view, rename and delete, with explicit confirmation before deleting its transactions.
- Transaction create, view, edit and delete, fractional shares, fees and chronological oversell validation. Invalid edits/deletions are rejected before saving.
- Consolidated and individual portfolio views, holdings search, allocation, average acquisition cost, realized/unrealized P&L and net contributions.
- Dark, responsive workspace with EUR reporting, European local currencies (including SEK, NOK, DKK, PLN, CZK, HUF, ISK, RON and TRY), USD, GBP, CHF and other supported listing currencies. Historical FX conversion is included in cost basis, P&L and comparisons; British-pence quotes are scaled correctly.
- European UCITS ETFs and listings alongside US equities and crypto: search by name, symbol or ISIN, or enter an exact exchange symbol such as VWCE.DE, SXR8.DE, ASML.AS or MC.PA.
- **Global lookup / Browse directories** replaces the small sample picker. Browse and paginate the connected European, US listing and Coinbase-fiat directories, filter by country/type/venue/currency, or search other provider listings. Source counts and fetch dates are visible. VVSM is available as **VVSM.DE**, ISIN **IE00BMC38736**, WKN **A2QC5J**. Conflicting provider currency mappings are excluded; known directory/price currency mismatches are rejected. The quick-pick buttons are shortcuts, not the available universe.
- Drag-select chart periods to see custom return, investment P&L, net flows, drawdown and volatility. Zoom to the selection, clear it, use preset ranges, or enter dates with the keyboard. Click holdings for an individual-asset history and transaction drill-down.
- Compare up to eight benchmarks at once: S&P 500, Nasdaq Composite, EURO STOXX 50, DAX, UCITS ETFs, stocks, crypto or custom symbols. Benchmarks share the reporting currency and period; missing history is left unavailable.
- Analytics includes drawdown and rolling-volatility charts, a monthly return heatmap, return distribution, unrealized P&L attribution, capital versus growth, monthly net contributions, correlations, asset classes and listing currencies. Risk statistics include Sharpe, Sortino, annualized volatility, historical 95% loss threshold, annualized return, time below peak and win rate. Benchmark diagnostics include beta, correlation, tracking error, information ratio and alpha.
- What-if Lab: up to eight independent substitution rules, enable/disable controls, partial allocations, saved scenarios, historical transaction impact, selected-period risk/return comparison and CSV export. Compare existing portfolios; project contributions with inflation, fees and annual contribution increases; plan rebalancing with new cash and export proposed orders. Simulators never execute trades.
- JSON backup/restore and explicit import of previous browser-stored Folio Lab data in Settings. Imports replace the workspace after confirmation; legacy browser data is preserved.
- Responsive layouts and keyboard-accessible dialogs.

## Free market data

The default provider is Yahoo Finance's **unofficial**, keyless chart endpoint. It is best effort: coverage, redistribution rights and continued availability are not guaranteed. Check provider terms before public redistribution. Exchange delays and closed markets apply; polling does not make delayed prices real-time.

The client polls every minute. Quotes are cached for 60 seconds and full history for a day, with recent data fetched between full history refreshes. Each holding shows its market timestamp. Failures show warnings; older quotes retain their timestamps. Missing quotes remain unavailable, never replaced with fabricated prices.

For supported crypto fiat pairs, the backend additionally shares a Coinbase Exchange public WebSocket feed across clients and relays `ticker_batch` trades through SSE. Trades arrive in five-second batches when prices change. Reconnection uses backoff and a heartbeat watchdog; source market time and receipt time are displayed separately. These prices are from **Coinbase's venue**, while daily history may come from Yahoo; both sources are shown. Disconnects and aged ticks lose the live badge.

**European equity/ETF live-feed parity with getquin is not established.** Its public application attributes real-time data to LSX and fundamentals/EOD to FactSet. No equivalent licensed feed entitlement is configured here. Yahoo snapshots, unknown delay, and the optional Twelve Data cache must not be represented as that feed. The Sources & timestamps panel distinguishes live crypto trades, delayed quotes, closed sessions, stale snapshots, unknown latency and illustrative prices. A zero-minute delay field alone does not establish verified real-time coverage.

Instrument directories are reference metadata, **not quote entitlements or a complete global securities master**. Xetra CSVs and the Nasdaq Trader directory refresh daily; the Coinbase directory includes active supported fiat pairs. The verification snapshot contained 18,874 indexed listings (5,542 Xetra, 12,871 US and 461 crypto pairs); live counts change. Provider lookup extends beyond these directories but has provider-side search limits. A mapped symbol may still have no price-provider coverage. Cache files live in `data/instrument-directory.json`; source failures and stale cached directories remain visible.

The researched comparison and outstanding features are tracked in [getquin audit](docs/getquin-audit.md). This revision does not claim dividend, fund-look-through, broker-sync or full getquin feature parity.

An optional official adapter uses a free **Twelve Data** key supplied through the `TWELVE_DATA_API_KEY` server environment variable. Its Basic plan currently advertises 8 credits/minute and 800/day, subject to instrument entitlements. The adapter budgets 8/minute and 790/day per process, caches quotes for 15 minutes and history for a day, and exposes coverage/quota errors. Larger portfolios may need retries after the minute limit. Crypto symbols such as BTC-USD map to BTC/USD. This adapter was not live-verified without a supplied key.

Provider references: [documentation](https://twelvedata.com/docs), [pricing](https://twelvedata.com/pricing).

Daily reference FX comes from [Frankfurter](https://frankfurter.dev/), without an API key. Historical rates are cached for six hours. Every conversion uses the most recent observation **on or before** its date; weekends carry the preceding available rate. Current holdings use the latest daily reference rate, not an intraday executable FX price. Missing historical rates block calculations instead of assuming parity. The EUR reference history starts in 1999.

## Methodology and current limits

- Transactions and reporting support **EUR, USD, GBP and CHF**. Listing currency, execution currency and reporting currency are independent. Tracked cash balances, dividends, automatic corporate actions, taxes and short selling are not implemented.
- Average cost is calculated chronologically per portfolio and asset, then consolidated. Buy fees enter basis; sale fees reduce realized proceeds. Sale proceeds count as external withdrawals.
- Daily returns remove end-of-day external cash flows. Intraday timing is unavailable, so this is a daily approximation. Return charts rebase to the visible window. Selected-period drawdown resets its peak at the selected period's start; the Drawdown chart resets at the visible window's start.
- Volatility, Sharpe, Sortino and regression metrics annualize using the observed frequency over the calendar span, accommodating mixed crypto/equity calendars. Sharpe, Sortino and alpha use a zero risk-free rate/target. Historical loss thresholds are descriptive, not forecasts. Correlations use common dates without forward-filled asset returns; benchmark comparisons carry the last available benchmark price onto portfolio observation dates.
- Benchmarks use provider close/index series. S&P 500 and Nasdaq Composite are price indices; the standard DAX is a performance index with dividends reinvested, and accumulating/distributing ETF prices follow the fund's distribution policy. They are not guaranteed to be comparable total-return indices. [Deutsche Börse: performance indices](https://www.deutsche-boerse.com/dbg-en/about-us/contact/glossary/glossary-article/Performance-index-243108).
- Charts use provider daily closes and recorded quantities. History must cover all acquisitions. The last daily close may differ from the latest quote used in summary cards.
- Historical transactions must reflect splits consistently with the provider's price series. Unadjusted legacy quantities can give incorrect results. This is not a tax-accounting engine.
- Substitution buys use the last close on or before each trade; sales remove a proportional hypothetical holding. Independent rules apply to original symbols and never cascade. Different sale proceeds are external withdrawals. Fees stay constant in reporting currency; dividends, taxes and slippage are excluded. Missing target history blocks the result.
- Projections use assumed returns, monthly compounding, annual fund fees, annual contribution increases and end-of-month contributions. The inflation-adjusted result is shown separately. The lower/upper return assumptions are not probability intervals. Rebalancing targets must total 100%; the planner adds new cash and estimates order fees as additional required cash, without executing trades.

## Storage and hosting

The database is `data/folio.db`, ignored by Git. Back it up to retain accounts and workspaces. JSON workspace exports contain no passwords or other accounts. Configure `DB_PATH` and `PORT` to override storage and port.

The server binds to loopback. Public hosting is a separate deployment decision: use HTTPS, `NODE_ENV=production` for Secure cookies, durable SQLite storage, backups and a reverse proxy. Email verification and password recovery are not implemented. This rebuild did not provision external hosting or accounts.

## Verification

```sh
npm test
npm run build
npm run test:browser
```

First-time browser setup: `npx playwright install chromium`.

Calculation tests cover basis, fees, sales/repurchases, liquidation, historical FX, missing rates, pence conversion, selected-period results, benchmark availability, monthly returns, multi-rule isolation and correlations. API tests use a temporary database for account isolation, persistence and rejected mutations. Browser tests run an isolated in-memory server for drag selection, currencies, multiple benchmarks, analytics, saved scenarios, projections, rebalancing, CRUD and desktop/mobile screenshots.
