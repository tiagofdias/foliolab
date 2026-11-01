# getquin reference audit — 31 October 2026

This audit was completed before the asset-discovery changes in this revision. Sources were getquin's public dashboard demo, markets, stock/ETF/crypto pages, portfolio tracker, performance, dividend and pricing pages. The help centre was unavailable through the research tool; account-only controls were not inspected. This is a feature and data-source comparison, not a claim to have reproduced the entire product.

## What was actually inspected

- [Public dashboard demo](https://app.getquin.com/en/dashboard?lang=en): aggregated portfolios, positions, sold positions, transaction ledger, allocation and performance; 1D/1W/1M/YTD/1Y/Max periods. Its allocation controls include regions, sectors, industries, assets, countries, currencies and market cap.
- [Markets](https://app.getquin.com/en/markets): stocks, ETFs and crypto discovery, movers and search. Its footer attributes real-time prices to LSX and fundamentals/end-of-day data to FactSet. A consumer-facing free tier is not evidence of a free, unrestricted API for another application's use.
- [Portfolio tracker](https://www.getquin.com/portfolio-tracker): broad security coverage, broker/manual imports, watchlists, benchmarks and ETF DeepDive. DeepDive describes looking through funds to their underlying securities and identifying overlapping exposure; a fund's listing country is not its underlying exposure.
- [Performance](https://www.getquin.com/portfolio-performance): costs, taxes, dividends, IRR and true time-weighted return, with regional/sector analysis.
- [Dividend tracker](https://www.getquin.com/dividend-tracker): payout history, cumulative income, forecasts, calendar and payment notifications.
- [Pricing](https://www.getquin.com/pricing): free tracking/data; additional analytics, dividend and allocation capabilities in paid tiers. Folio Lab's requirement remains free local operation.

## Gap register

| Capability | Folio Lab before this revision | Required behavior / honest boundary |
| --- | --- | --- |
| Security discovery | Small preset list; remote lookup disabled in demo | Browse a real instrument directory, paginate/filter it, and search beyond presets in both demo and account modes. Keep source coverage explicit. |
| Instrument identity | Symbol and name | Preserve ISIN, venue, native currency and provider symbol. The same fund can have different tickers at different venues. |
| Live quotes | Once-per-minute unofficial polling | An actual streaming feed where available; source, market time, receive time, connection health and delay status visible per instrument. Polling frequency must not be called exchange latency. |
| VVSM | Absent from presets; invisible to demo search | Resolve VanEck Semiconductor UCITS ETF, ISIN IE00BMC38736, including VVSM.DE on Xetra. Verify the exact listing instead of treating bare VVSM as an exchange-independent identifier. |
| Equity/ETF real-time parity | Not established | LSX/FactSet credentials and redistribution entitlement are not available in this checkout. Do not present Yahoo snapshots as the same feed or guarantee real-time Xetra/European equities. |
| Crypto real-time | Polling only | Public Coinbase Exchange ticker stream can provide venue-specific real-time trades without an account key. It is a different feed from historical Yahoo closes and must be identified as such. |
| Intraday portfolio history | Daily closes | 1D/1W curves need intraday prices, transaction timing and FX methodology. Daily history must not be relabeled intraday. |
| Performance | Daily approximated TWR; selected-period metrics | Preserve existing calculations; add separately validated IRR/XIRR and cash/dividend/tax accounting before claiming getquin-equivalent total performance. |
| Dividends | Not implemented | Recorded and imported payments, withholding tax, income analytics, payment calendar; distinguish announced payments from estimates. |
| ETF look-through | Positions and listing-currency allocation | Dated issuer/provider constituent weights, overlapping exposure and explicit unknown coverage; never infer geographic holdings from listing venue. |
| Geography / sectors / industries | Not implemented | A sourced classification dataset with dates and unknown categories; geographic and sector charts require this data first. |
| Imports | Manual CRUD, JSON backup and legacy import | CSV import preview, column mapping, currency validation and deduplication; broker integrations require supported external connectors. |
| Cash, net worth, tax, corporate actions | No cash ledger; trades only | A ledger model for deposits, withdrawals, dividends, fees, tax, splits and transfers, plus migration and reconciliation tests. |
| Watchlists / alerts | Not implemented | Persisted watchlists and explicit alert rules; unattended notifications require a running backend and an authorized notification channel. |
| Multi-benchmark analysis | Implemented | Keep it, but make discovery broad and distinguish price indices, performance indices and accumulating/distributing funds. |
| What-if experiments | Implemented | Keep multi-rule, saved scenarios and selected-period results; do not fabricate prices when replacement history is unavailable. |
| Account isolation / demo | Implemented | Keep separate account storage; demo balances remain illustrative even when its discovery searches real instrument metadata. |

## Discovery/data architecture

1. Download official reference directories for Xetra, US-listed securities and active Coinbase fiat products, cache them and expose a browsable paginated API. These are **instrument metadata**, not real-time quote entitlements. Xetra symbols are mapped to Yahoo's `.DE` convention for price lookup; directory membership does not guarantee that the quote provider covers every instrument.
2. Keep global provider search for listings outside the downloaded directories. Label its results as lookup matches rather than a complete downloadable world securities database.
3. Show counts, directory sources, fetch/source dates, stale snapshots and any source failure. Do not advertise a fabricated “all global assets” count or getquin's 800k coverage as our coverage.
4. Separate streamed quotes from history, and expose both source attributions. Historical FX remains daily reference data.

Sources: [Xetra reference directory](https://www.cashmarket.deutsche-boerse.com/cash-en/trading/Tradable-Instruments-Xetra/xetra), [Nasdaq symbol directory definitions](https://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs), [Nasdaq directory](https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt), [Coinbase products](https://api.exchange.coinbase.com/products), [Coinbase ticker documentation](https://docs.cdp.coinbase.com/exchange/websocket-feed/channels).

## Release acceptance

- VVSM is discoverable by ticker, name and ISIN; the exact exchange listing is visible.
- Searching is not disabled by demo mode. Live discovery must not silently turn demo balances into real prices or mix illustrative history with real quotes.
- Directory browsing is paginated, filterable and source-attributed; no UI cap masquerades as a complete universe.
- Stream disconnects and stale prices remain distinguishable from a healthy feed. Unknown delay is never labeled verified real-time.
- Remaining gaps above remain visible in this document rather than being represented by placeholder analytics.
