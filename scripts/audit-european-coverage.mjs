// Explicit, bounded provider probes. This samples venues; it does not certify
// every directory symbol or create synthetic prices for missing listings.
import { mkdir, writeFile } from "node:fs/promises";
import { getCatalog, marketCoverage } from "../server/catalog.mjs";
import { DELAY_SOURCE, marketForSymbol } from "../shared/markets.mjs";
const base = process.env.FOLIO_API_URL || "http://127.0.0.1:3001";
const symbols = [
  "VVSM.DE",
  "CSPX.AS",
  "CW8.PA",
  "BEL.BR",
  "VWCE.MI",
  "SMH.L",
  "CSSPX.SW",
  "XACT-OMXS30.ST",
  "XACTC25.CO",
  "SLG-OMXH25.HE",
  "LEQ.IC",
  "DNBNOR-OBXO.OL",
  "ETFBW20TR.WA",
  "LYXIB.MC",
];
const catalog = await getCatalog(),
  coverage = await marketCoverage(),
  checks = [];
for (let i = 0; i < symbols.length; i += 2) {
  const pair = await Promise.all(
    symbols.slice(i, i + 2).map(async (symbol) => {
      try {
        const r = await fetch(
            `${base}/api/market/chart/${encodeURIComponent(symbol)}`,
            { signal: AbortSignal.timeout(45000) },
          ),
          q = await r.json();
        return {
          symbol,
          country: marketForSymbol(symbol)?.country,
          available: r.ok,
          error: q.error || null,
          currency: q.currency || null,
          historyPoints: q.history?.length || 0,
          marketTime: q.asOf || null,
          publishedDelay: q.documentedDelay ?? null,
          checkedAt: new Date().toISOString(),
        };
      } catch (e) {
        return {
          symbol,
          available: false,
          error: e.message,
          checkedAt: new Date().toISOString(),
        };
      }
    }),
  );
  checks.push(...pair);
}
const report = {
  checkedAt: new Date().toISOString(),
  directoryTotal: catalog.quotes.length,
  ambiguousSymbolsExcluded: catalog.conflicts?.length || 0,
  sources: catalog.sources.map(({ quotes, ...s }) => ({
    ...s,
    count: quotes.length,
  })),
  markets: coverage.markets,
  checks,
};
await mkdir("data", { recursive: true });
await writeFile(
  "data/european-coverage-audit.json",
  JSON.stringify(report, null, 2),
);
const lines = [
  "# European ETF coverage audit",
  "",
  `Checked ${report.checkedAt}. Accepted policy: delayed quotes are suitable for portfolio analysis. **A universal 15-minute maximum is not available on the current source.**`,
  "",
  `${catalog.quotes.length.toLocaleString("en-GB")} total indexed listings across European, US and crypto directories. ${report.ambiguousSymbolsExcluded} ambiguous provider symbols are excluded to prevent mixing instruments or trading currencies.`,
  "",
  "Directory coverage and successful quote coverage are different. The checks below sample representative listings; they do not certify every ETF. An unconnected directory or unmapped feed does not establish that a country has no ETFs. European exposure, fund domicile and listing country are different concepts.",
  "",
  "## Connected sources",
  "",
  "| Source | Reference rows | State |",
  "| --- | ---: | --- |",
  ...report.sources.map(
    (s) =>
      `| [${s.label}](${s.url}) | ${s.count} | ${s.error ? (s.stale ? "Cached; refresh failed" : "Unavailable") : "Fetched"}${s.skipped ? `; ${s.skipped} unmapped rows excluded` : ""} |`,
  ),
  "",
  "Counts in the next table describe indexed ETFs; ETCs, ETNs and uncertain ETP classifications remain separate. Source publication dates are shown in the app when supplied; a fetch date is not a publication date.",
  "",
  "## Country and venue coverage",
  "",
  "| Country | Venue | ETF listings | Directory state | Published source delay |",
  "| --- | --- | ---: | --- | --- |",
  ...coverage.markets.map(
    (m) =>
      `| ${m.countryName} | ${m.exchange}${m.suffix ? " (" + m.suffix + ")" : ""} | ${m.listingCount} | ${m.directoryStatus} | ${m.delayMinutes === null ? "Unverified" : m.delayMinutes === 0 ? "Source lists real-time; snapshot latency unverified" : m.delayMinutes + " min"} |`,
  ),
  "",
  "## Quote and historical-data probes",
  "",
  "| Listing | Quote available | Native currency | Daily history points | Published delay |",
  "| --- | --- | --- | ---: | --- |",
  ...checks.map(
    (c) =>
      `| ${c.symbol} | ${c.available ? "Yes" : "No: " + c.error} | ${c.currency || "—"} | ${c.historyPoints || 0} | ${c.publishedDelay == null ? "Unverified" : c.publishedDelay + " min"} |`,
  ),
  "",
  "Short or missing historical series cannot support a full historical backtest. The application withholds analyses without sufficient history. These checks occurred outside normal European trading hours; they verify retrieval and history availability, not live-session latency.",
  "",
  "## Known gaps",
  "",
  "- Global lookup is available beyond connected directories, but is not a complete exchange security master. Countries marked Coverage gap have no verified mapped feed in this implementation.",
  "- Euronext multi-currency segments without a distinct supported price-provider symbol and SIX rows without a usable ticker mapping are excluded. Conflicting symbol/currency identities are excluded instead of silently merged.",
  "- Some provider symbols remain unverified candidates until a quote loads. Known directory/quote currency mismatches are rejected. The price provider is unofficial and can have missing listings, limited history or outages.",
  "- Cached metadata is retained during source failures and labelled as cached. This is not a guarantee of all European ETFs or all exchange listings.",
  "- Current quotes and historical FX have different schedules. FX uses dated daily reference rates, not intraday exchange rates.",
  "",
  `Delay schedule: [Yahoo exchange and provider table](${DELAY_SOURCE}). The app uses the larger positive value of the provider-reported and published exchange delay; zero does not establish a verified live stream.`,
  "",
  "Reproduce: start Folio Lab, then run `npm run audit:markets`. Set `FOLIO_API_URL` if the API runs on another port. Machine-readable results are saved to `data/european-coverage-audit.json`.",
  "",
];
await writeFile("docs/european-etf-coverage.md", lines.join("\n"));
console.log(
  JSON.stringify({
    directoryTotal: report.directoryTotal,
    ETFListings: catalog.quotes.filter(
      (q) => q.type === "ETF" && q.country && q.country !== "US",
    ).length,
    connectedCountries: new Set(
      coverage.markets.filter((m) => m.listingCount).map((m) => m.country),
    ).size,
    probes: checks.length,
    available: checks.filter((c) => c.available).length,
    failures: checks.filter((c) => !c.available),
  }),
);
