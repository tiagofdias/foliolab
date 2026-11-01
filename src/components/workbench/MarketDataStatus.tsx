import { useEffect, useState } from "react";
import { Radio, Info } from "lucide-react";
import { quoteQuality } from "../../../shared/quoteQuality.mjs";
export function QuoteBadge({ quote }: { quote: any }) {
  const quality = quoteQuality(quote);
  return (
    <span className={"quote-badge " + quality.kind} title={quality.detail}>
      {quality.label}
    </span>
  );
}
export function MarketDataStatus({
  quotes,
  symbols,
  liveStatus,
  illustrative,
}: {
  quotes: Record<string, any>;
  symbols: string[];
  liveStatus: string;
  illustrative: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const rows = symbols.map((symbol) => ({
      symbol,
      quote: quotes[symbol],
      quality: quoteQuality(quotes[symbol], now),
    })),
    live = rows.filter((r) => r.quality.kind === "live").length,
    unknown = rows.filter((r) =>
      ["unverified", "delayed", "stale", "unavailable"].includes(
        r.quality.kind,
      ),
    ).length;
  return (
    <details className="market-data-status">
      <summary>
        <span>
          <Radio size={14} />
          {illustrative
            ? "Illustrative demo prices"
            : live
              ? `${live} live crypto ${live === 1 ? "quote" : "quotes"}`
              : "Market data coverage"}
          <span className="market-summary-separator">·</span>
          {illustrative
            ? "Enable live market data to test provider prices"
            : `${unknown} delayed, stale or unverified · ${rows.length - live - unknown} closed-session snapshots`}
        </span>
        <span>
          Sources & timestamps <Info size={12} />
        </span>
      </summary>
      <div className="data-status-content">
        <p>
          Crypto stream:{" "}
          <strong>
            {illustrative ? "off in illustrative demo" : liveStatus}
          </strong>
          . Coinbase provides venue-specific streaming trades in five-second
          batches. Equity/ETF prices are delayed snapshots: Xetra and many
          continental venues publish 15-minute delays, London and Milan 20, and
          SIX Switzerland 30. Actual quote age may be longer. Nordic snapshots
          are not labelled verified live solely from their published schedule.
          Historical FX is a daily reference rate.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Listing</th>
                <th>Status</th>
                <th>Quote source / venue</th>
                <th>Market timestamp</th>
                <th>Published delay / quote age</th>
                <th>Received / fetched</th>
                <th>History source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ symbol, quote: q, quality }) => (
                <tr key={symbol}>
                  <td>{symbol}</td>
                  <td>
                    <span
                      className={"quote-badge " + quality.kind}
                      title={quality.detail}
                    >
                      {quality.label}
                    </span>
                  </td>
                  <td>
                    {q?.source || "Unavailable"}
                    <small>{q?.exchange || "—"}</small>
                  </td>
                  <td>
                    {q?.asOf ? new Date(q.asOf).toLocaleString("en-GB") : "—"}
                  </td>
                  <td>
                    {q?.documentedDelay != null
                      ? `${q.documentedDelay} min source schedule`
                      : q?.delay != null
                        ? `${q.delay} min provider-reported`
                        : "Unverified"}
                    <small>
                      {q?.asOf
                        ? `${Math.max(0, Math.floor((now - Date.parse(q.asOf)) / 60000)).toLocaleString()} min since last trade`
                        : "No market timestamp"}
                    </small>
                  </td>
                  <td>
                    {q?.receivedAt || q?.fetchedAt
                      ? new Date(q.receivedAt || q.fetchedAt).toLocaleString(
                          "en-GB",
                        )
                      : "—"}
                  </td>
                  <td>{q?.historySource || q?.source || "Unavailable"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Live means a validated streaming trade from the named venue. A
          refreshed snapshot, an open market or a reported zero-minute delay
          alone is not treated as proof of real-time coverage.
        </p>
      </div>
    </details>
  );
}
