import { useMemo, useState, useEffect } from "react";
import { Chart as ChartJS, BarElement, ArcElement } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Plus, X, ArrowUpRight, Search, ShieldCheck } from "lucide-react";
import { ledger } from "../../../shared/finance.mjs";
import {
  comparisonSeries,
  periodMetrics,
  monthlyReturns,
  benchmarkMetrics,
  rollingVolatility,
  correlationMatrix,
  type HistoryPoint,
} from "../../../shared/analytics.mjs";
import {
  ASSETS,
  BENCHMARKS,
  COLORS,
  labelFor,
  assetType,
  formatMoney,
  formatPercent,
} from "../../data/catalog";
import type { PortfolioActivity } from "../../types";
import {
  ExplorerChart,
  type DateWindow,
  type Comparison,
} from "./ExplorerChart";
import { AssetSearch } from "./AssetSearch";
import { QuoteBadge } from "./MarketDataStatus";
ChartJS.register(BarElement, ArcElement);
type Summary = ReturnType<typeof ledger>;
interface Props {
  history: HistoryPoint[];
  summary: Summary;
  quotes: Record<string, any>;
  nativeQuotes: Record<string, any>;
  trades: PortfolioActivity[];
  currency: string;
  benchmarks: string[];
  onBenchmarks: (symbols: string[]) => void;
  busy?: boolean;
  scope: string;
  demo: boolean;
  illustrative?: boolean;
  analytics: boolean;
  onSimulate: (symbol: string) => void;
}
export function PortfolioAnalytics({
  history,
  summary,
  quotes,
  nativeQuotes,
  trades,
  currency,
  benchmarks,
  onBenchmarks,
  busy = false,
  scope,
  demo,
  illustrative = demo,
  analytics,
  onSimulate,
}: Props) {
  const [window, setWindow] = useState<DateWindow | null>(null),
    [search, setSearch] = useState(""),
    [allocation, setAllocation] = useState("Positions"),
    [asset, setAsset] = useState<string | null>(null),
    [showSearch, setShowSearch] = useState(false);
  useEffect(() => {
    if (asset)
      document
        .querySelector(".asset-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [asset]);
  const current = history.filter(
      (p) => !window || (p.date >= window.start && p.date <= window.end),
    ),
    stats = periodMetrics(current);
  const comparisons = useMemo<Comparison[]>(
    () =>
      benchmarks.map((symbol, i) => ({
        symbol,
        label: labelFor(symbol),
        color: COLORS[(i + 1) % COLORS.length],
        kind: "benchmark",
        points: comparisonSeries(
          quotes[symbol],
          history.map((p) => p.date),
        ),
      })),
    [benchmarks, quotes, history],
  );
  const m = (value: number) => formatMoney(value, currency),
    weights = summary.holdings.map((h) =>
      summary.value ? ((h.value || 0) / summary.value) * 100 : 0,
    );
  const groups = new Map<string, number>();
  for (const h of summary.holdings) {
    const key =
      allocation === "Positions"
        ? h.symbol
        : allocation === "Asset classes"
          ? assetType(h.symbol, nativeQuotes[h.symbol])
          : nativeQuotes[h.symbol]?.currency || "Unknown";
    groups.set(key, (groups.get(key) || 0) + (h.value || 0));
  }
  const allMissing = benchmarks.filter((s) => !quotes[s]);
  return (
    <>
      <div className="metric-grid">
        <Metric
          label="Portfolio value"
          value={summary.complete ? m(summary.value) : "Incomplete prices"}
          detail={`${summary.holdings.length} assets · ${currency} reporting`}
        />
        <Metric
          label="Unrealized P&L"
          value={summary.complete ? m(summary.profit) : "—"}
          detail={
            summary.complete && summary.cost
              ? formatPercent((summary.profit / summary.cost) * 100) +
                " on remaining cost basis"
              : "Waiting for complete prices"
          }
          positive={summary.profit >= 0}
        />
        <Metric
          label="Realized P&L"
          value={m(summary.realized)}
          detail="Historical FX · average cost basis"
          positive={summary.realized >= 0}
        />
        <Metric
          label="Net contributions"
          value={m(summary.contributions)}
          detail={`${m(summary.fees)} in recorded fees`}
        />
      </div>
      <div className="benchmark-bar">
        <div className="benchmark-title">
          <span className="eyebrow">COMPARE WITH</span>
          <small>Price / index returns in {currency}</small>
        </div>
        <div className="benchmark-chips">
          {benchmarks.map((s, i) => (
            <span className="benchmark-chip" key={s}>
              <i style={{ background: COLORS[(i + 1) % COLORS.length] }} />
              {labelFor(s)}
              <button
                aria-label={"Remove benchmark " + labelFor(s)}
                disabled={busy}
                onClick={() => onBenchmarks(benchmarks.filter((a) => a !== s))}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            className="benchmark-add"
            disabled={busy || benchmarks.length >= 8}
            onClick={() => setShowSearch(!showSearch)}
          >
            <Plus size={13} />
            Add benchmark
          </button>
        </div>
        {showSearch && (
          <div className="benchmark-picker">
            <div className="quick-benchmarks">
              {BENCHMARKS.filter((s) => !benchmarks.includes(s)).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onBenchmarks([...benchmarks, s].slice(0, 8));
                    setShowSearch(false);
                  }}
                >
                  {labelFor(s)} <Plus size={12} />
                </button>
              ))}
            </div>
            <AssetSearch
              demo={demo}
              onSelect={(a) => {
                if (!benchmarks.includes(a.symbol))
                  onBenchmarks([...benchmarks, a.symbol].slice(0, 8));
                setShowSearch(false);
              }}
            />
          </div>
        )}
      </div>
      {allMissing.length > 0 && (
        <p className="inline-warning">
          {illustrative
            ? "No illustrative price fixture for: "
            : "Waiting for benchmark prices: "}
          {allMissing.map(labelFor).join(", ")}.
          {illustrative
            ? " Enable “Use live market data” to request provider prices for these listings."
            : " Unavailable comparisons are left blank."}
        </p>
      )}
      <div className={analytics ? "analytics-explorer" : "overview-charts"}>
        <ExplorerChart
          history={history}
          currency={currency}
          comparisons={comparisons}
          onWindowChange={setWindow}
          resetKey={scope + currency}
          title={
            analytics
              ? "Performance & benchmark analysis"
              : "Your portfolio, in context"
          }
        />
        {!analytics && (
          <section className="card allocation-panel">
            <div className="card-heading">
              <div>
                <span className="eyebrow">COMPOSITION</span>
                <h2>Where you’re invested</h2>
              </div>
            </div>
            <div className="segmented allocation-switch">
              {["Positions", "Asset classes", "Currencies"].map((v) => (
                <button
                  key={v}
                  className={allocation === v ? "selected" : ""}
                  onClick={() => setAllocation(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="donut-wrap">
              {summary.value > 0 ? (
                <>
                  <Doughnut
                    data={{
                      labels: [...groups.keys()],
                      datasets: [
                        {
                          data: [...groups.values()],
                          backgroundColor: COLORS,
                          borderColor: "#171b28",
                          borderWidth: 4,
                          hoverOffset: 5,
                        },
                      ],
                    }}
                    options={{
                      cutout: "80%",
                      maintainAspectRatio: false,
                      animation: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (c) =>
                              `${c.label}: ${m(Number(c.raw))} · ${((Number(c.raw) / summary.value) * 100).toFixed(1)}%`,
                          },
                        },
                      },
                    }}
                  />
                  <div className="donut-center">
                    <small>
                      {allocation === "Positions" ? "Positions" : allocation}
                    </small>
                    <strong>{groups.size}</strong>
                    <small>
                      {summary.complete ? "fully priced" : "partial valuation"}
                    </small>
                  </div>
                </>
              ) : (
                <div className="empty">Add assets to see your allocation.</div>
              )}
            </div>
            <div className="allocation-list">
              {[...groups]
                .sort((a, b) => b[1] - a[1])
                .map(([label, value]) => (
                  <div key={label}>
                    <span>
                      <i
                        style={{
                          background:
                            COLORS[
                              [...groups.keys()].indexOf(label) % COLORS.length
                            ],
                        }}
                      />
                      {label}
                    </span>
                    <strong>
                      {summary.value
                        ? ((value / summary.value) * 100).toFixed(1)
                        : "0"}
                      %
                    </strong>
                    <small>{m(value)}</small>
                  </div>
                ))}
            </div>
            <p className="note">
              Currency refers to the listing, not underlying fund exposure.{" "}
              {summary.complete ? "" : "Some asset prices are missing."}
            </p>
          </section>
        )}
      </div>
      {analytics && (
        <DeepAnalytics
          history={current}
          summary={summary}
          quotes={quotes}
          nativeQuotes={nativeQuotes}
          currency={currency}
          stats={stats}
          benchmarks={benchmarks}
        />
      )}
      <section className="card holdings">
        <div className="card-heading">
          <div>
            <span className="eyebrow">POSITIONS</span>
            <h2>
              Your holdings{" "}
              <span className="count">{summary.holdings.length}</span>
            </h2>
          </div>
          <div className="search-field compact">
            <Search size={14} />
            <input
              aria-label="Search holdings"
              value={search}
              placeholder="Filter holdings…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Asset / listing",
                  "Native price",
                  "Units",
                  "Cost basis",
                  "Market value",
                  "Unrealized P&L",
                  "Weight",
                  "Explore",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.holdings
                .filter((h) =>
                  (h.symbol + " " + h.name)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((h) => {
                  const i = summary.holdings.findIndex(
                      (a) => a.symbol === h.symbol,
                    ),
                    native = nativeQuotes[h.symbol];
                  return (
                    <tr key={h.symbol}>
                      <td>
                        <button
                          className="asset-cell asset-button"
                          onClick={() => setAsset(h.symbol)}
                        >
                          <span
                            className="asset-icon"
                            style={{
                              background: COLORS[i % COLORS.length] + "19",
                              color: COLORS[i % COLORS.length],
                            }}
                          >
                            {h.symbol[0]}
                          </span>
                          <span>
                            <strong>{h.symbol}</strong>
                            <small>{h.name}</small>
                            <small>
                              {native?.exchange ||
                                ASSETS.find((a) => a.symbol === h.symbol)
                                  ?.exchange ||
                                "Listing unavailable"}{" "}
                              · {native?.currency || "—"}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>
                        {native
                          ? formatMoney(
                              native.currentPrice /
                                (native.currency === "GBp" ||
                                native.currency === "GBX"
                                  ? 100
                                  : 1),
                              native.currency === "GBp" ||
                                native.currency === "GBX"
                                ? "GBP"
                                : native.currency,
                            )
                          : "Unavailable"}
                        <small>
                          {native?.asOf
                            ? new Date(native.asOf).toLocaleString("en-GB")
                            : "No quote"}
                        </small>
                        <QuoteBadge quote={native} />
                        {(native?.currency === "GBp" ||
                          native?.currency === "GBX") && (
                          <small>Converted from quoted pence</small>
                        )}
                      </td>
                      <td>
                        {h.quantity.toLocaleString("en-GB", {
                          maximumFractionDigits: 6,
                        })}
                      </td>
                      <td>{m(h.cost)}</td>
                      <td className="bold">
                        {h.value === null ? "—" : m(h.value)}
                      </td>
                      <td
                        className={
                          h.value !== null && h.value < h.cost
                            ? "negative"
                            : "positive"
                        }
                      >
                        {h.value === null ? "—" : m(h.value - h.cost)}
                        <small>
                          {h.value !== null && h.cost > 0
                            ? formatPercent(((h.value - h.cost) / h.cost) * 100)
                            : "—"}
                        </small>
                      </td>
                      <td>
                        {h.value === null ? "—" : weights[i].toFixed(1) + "%"}
                        <div className="weight-track">
                          <i
                            style={{
                              width: weights[i] + "%",
                              background: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          title="Open asset history"
                          aria-label={"Open " + h.symbol + " history"}
                          onClick={() => setAsset(h.symbol)}
                        >
                          <ChartNoAxesIcon />
                        </button>
                        <button
                          className="icon-button"
                          title="Simulate replacement"
                          aria-label={"Simulate " + h.symbol}
                          onClick={() => onSimulate(h.symbol)}
                        >
                          <FlaskIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!summary.holdings.length && (
            <div className="empty">
              No open positions. Add a transaction to start exploring.
            </div>
          )}
        </div>
        <div className="table-footer">
          <span>
            Values in {currency} · acquisition costs converted at historical FX
          </span>
          <span>
            Click an asset to explore its history <ArrowUpRight size={12} />
          </span>
        </div>
      </section>
      {asset && (
        <section className="asset-detail">
          <div className="detail-heading">
            <div>
              <span className="eyebrow">ASSET DEEP DIVE</span>
              <h2>
                {labelFor(asset)} <span className="muted">{asset}</span>
              </h2>
              <p>
                One-unit price performance in {currency}; this is not your
                position’s cash-flow return.
              </p>
            </div>
            <button className="secondary" onClick={() => setAsset(null)}>
              <X size={14} />
              Close details
            </button>
          </div>
          <ExplorerChart
            history={(quotes[asset]?.history || []).map(
              (p: any, _i: number, h: any[]) => ({
                date: p.date,
                value: p.price,
                net: h[0].price,
                return: (p.price / h[0].price - 1) * 100,
                drawdown: 0,
              }),
            )}
            currency={currency}
            title={asset + " price history"}
            resetKey={asset + currency}
            defaultMetric="return"
          />
          <section className="card">
            <div className="card-heading">
              <h2>Your transactions in {asset}</h2>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Units</th>
                    <th>Native unit price</th>
                    <th>Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {trades
                    .filter((t) => t.symbol === asset)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((t) => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>{t.type}</td>
                        <td>{t.quantity}</td>
                        <td>{formatMoney(t.unitPrice, t.currency)}</td>
                        <td>{formatMoney(t.fee, t.currency)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}
    </>
  );
}
export function Metric({
  label,
  value,
  detail,
  positive,
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
}) {
  return (
    <section className="metric">
      <div className="metric-label">
        {label}
        <ArrowUpRight size={14} />
      </div>
      <strong
        className={
          positive === undefined ? "" : positive ? "positive" : "negative"
        }
      >
        {value}
      </strong>
      <small>{detail}</small>
    </section>
  );
}
function ChartNoAxesIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M3 20h18M5 15l5-5 4 3 6-9" />
    </svg>
  );
}
function FlaskIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M9 3h6m-5 0v7l-6 9q-1 2 2 2h12q3 0 2-2l-6-9V3M8 15h8" />
    </svg>
  );
}
function DeepAnalytics({
  history,
  summary,
  quotes,
  nativeQuotes,
  currency,
  stats,
  benchmarks,
}: {
  history: HistoryPoint[];
  summary: Summary;
  quotes: Record<string, any>;
  nativeQuotes: Record<string, any>;
  currency: string;
  stats: ReturnType<typeof periodMetrics>;
  benchmarks: string[];
}) {
  const monthly = monthlyReturns(history),
    years = [...new Set(monthly.map((p) => p.month.slice(0, 4)))]
      .sort()
      .reverse();
  const returns = history.slice(1).map((p, i) => {
    const base = 100 + history[i].return;
    return base > 0 ? ((100 + p.return) / base - 1) * 100 : 0;
  });
  const buckets = [-Infinity, -3, -2, -1, -0.5, 0, 0.5, 1, 2, 3, Infinity],
    histogram = buckets
      .slice(0, -1)
      .map(
        (v, i) => returns.filter((r) => r >= v && r < buckets[i + 1]).length,
      ),
    bucketLabels = [
      "< −3%",
      "−3 to −2",
      "−2 to −1",
      "−1 to −.5",
      "−.5 to 0",
      "0 to .5",
      ".5 to 1",
      "1 to 2",
      "2 to 3",
      "≥ 3%",
    ];
  const vol = rollingVolatility(history),
    symbols = summary.holdings.map((h) => h.symbol).slice(0, 10),
    correlations = history.length
      ? correlationMatrix(
          symbols,
          quotes,
          history[0].date,
          history.at(-1)!.date,
        )
      : { observations: 0, values: [] };
  const flows = new Map<string, number>();
  for (let i = 1; i < history.length; i++) {
    const key = history[i].date.slice(0, 7);
    flows.set(key, (flows.get(key) || 0) + history[i].net - history[i - 1].net);
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0, maxTicksLimit: 7 },
      },
      y: { border: { display: false }, grid: { color: "#272c3d" } },
    },
    elements: {
      point: { radius: 0 },
      line: { borderWidth: 1.7, tension: 0.12 },
    },
  };
  const currencies = new Map<string, number>(),
    classes = new Map<string, number>();
  for (const h of summary.holdings) {
    const c = nativeQuotes[h.symbol]?.currency || "Unknown";
    currencies.set(c, (currencies.get(c) || 0) + (h.value || 0));
    const a = assetType(h.symbol, nativeQuotes[h.symbol]);
    classes.set(a, (classes.get(a) || 0) + (h.value || 0));
  }
  return (
    <>
      <div className="analytics-caption">
        <span className="eyebrow">UNDERSTAND THE SELECTED PERIOD</span>
        <p>
          {stats
            ? `${stats.start} → ${stats.end}. Drag on the performance chart to update all historical analysis below.`
            : "Add price history to unlock portfolio analysis."}
        </p>
      </div>
      <div className="risk-grid">
        {[
          [
            "Annualized volatility",
            stats ? formatPercent(stats.volatility) : "—",
            "Calendar-adjusted observation frequency",
          ],
          [
            "Sharpe ratio",
            stats?.sharpe?.toFixed(2) || "—",
            "Zero risk-free-rate assumption",
          ],
          [
            "Sortino ratio",
            stats?.sortino?.toFixed(2) || "—",
            "Downside deviation · zero target",
          ],
          [
            "95% daily loss threshold",
            stats ? formatPercent(stats.var95) : "—",
            "Historical 5th percentile · not a forecast",
          ],
          [
            "Positive observations",
            stats ? stats.winRate.toFixed(1) + "%" : "—",
            "Zero-return observations count as flat",
          ],
          [
            "Best / worst observation",
            stats
              ? `${formatPercent(stats.best)} / ${formatPercent(stats.worst)}`
              : "—",
            "Daily observation return",
          ],
          [
            "Annualized return",
            stats ? formatPercent(stats.annualReturn) : "—",
            "Shown only for at least one year",
          ],
          [
            "Longest time below peak",
            stats ? Math.round(stats.maxDuration) + " days" : "—",
            "Calendar days within selected period",
          ],
        ].map(([label, value, detail]) => (
          <Metric key={label} label={label} value={value} detail={detail} />
        ))}
      </div>
      {benchmarks.length > 0 && (
        <section className="card benchmark-diagnostics">
          <div className="card-heading">
            <div>
              <span className="eyebrow">BEYOND THE HEADLINE RETURN</span>
              <h2>How you differ from each benchmark</h2>
              <p>
                Aligned selected-period observations in {currency}; alpha and
                ratios assume a 0% risk-free rate.
              </p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Benchmark</th>
                  <th>Beta</th>
                  <th>Correlation</th>
                  <th>Tracking error / yr</th>
                  <th>Information ratio</th>
                  <th>Alpha / yr</th>
                  <th>Observations</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((symbol) => {
                  const metrics = benchmarkMetrics(history, quotes[symbol]);
                  return (
                    <tr key={symbol}>
                      <td>{labelFor(symbol)}</td>
                      <td>{metrics?.beta?.toFixed(2) || "—"}</td>
                      <td>{metrics?.correlation?.toFixed(2) || "—"}</td>
                      <td>{formatPercent(metrics?.trackingError)}</td>
                      <td>{metrics?.informationRatio?.toFixed(2) || "—"}</td>
                      <td>{formatPercent(metrics?.alpha)}</td>
                      <td>{metrics?.observations || "Insufficient history"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note">
            Beta measures sensitivity; correlation measures co-movement.
            Tracking error measures the variability of excess returns. Alpha
            uses a simple linear market model, not evidence of persistent skill.
          </p>
        </section>
      )}
      <div className="analysis-grid">
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">DOWNSIDE</span>
              <h2>Drawdown history</h2>
              <p>How far returns fell below their previous high.</p>
            </div>
          </div>
          <div className="analysis-chart">
            <Line
              options={{
                ...options,
                scales: {
                  ...options.scales,
                  y: {
                    ...options.scales.y,
                    ticks: { callback: (v: string | number) => v + "%" },
                  },
                },
              }}
              data={{
                labels: stats?.drawdowns.map((p) => p.date) || [],
                datasets: [
                  {
                    label: "Drawdown %",
                    data: stats?.drawdowns.map((p) => p.value) || [],
                    borderColor: "#e58caa",
                    backgroundColor: "rgba(229,140,170,.1)",
                    fill: true,
                  },
                ],
              }}
            />
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">CONSISTENCY</span>
              <h2>Rolling volatility</h2>
              <p>Annualized risk over 30 return observations.</p>
            </div>
          </div>
          <div className="analysis-chart">
            {history.length > 30 ? (
              <Line
                options={options}
                data={{
                  labels: vol.map((p) => p.date),
                  datasets: [
                    {
                      label: "Volatility % / yr",
                      data: vol.map((p) => p.value),
                      borderColor: "#f0bd72",
                    },
                  ],
                }}
              />
            ) : (
              <div className="empty">
                Select a period with at least 31 observations.
              </div>
            )}
          </div>
        </section>
        <section className="card heatmap-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">SEASONALITY</span>
              <h2>Monthly returns</h2>
              <p>
                Cash-flow adjusted; boundary months use only the selected days.
              </p>
            </div>
            <span className="heatmap-key">
              Loss <i /> Gain
            </span>
          </div>
          <div className="table-scroll">
            <table className="heatmap">
              <thead>
                <tr>
                  <th>Year</th>
                  {[
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ].map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {years.map((year) => (
                  <tr key={year}>
                    <th>{year}</th>
                    {Array.from({ length: 12 }, (_, i) => {
                      const p = monthly.find(
                        (p) =>
                          p.month ===
                          `${year}-${String(i + 1).padStart(2, "0")}`,
                      );
                      return (
                        <td key={i}>
                          <span
                            title={
                              p
                                ? `${p.month}: ${formatPercent(p.return)}`
                                : "No observations"
                            }
                            style={
                              p
                                ? {
                                    background:
                                      p.return >= 0
                                        ? `rgba(87,207,173,${Math.min(0.55, 0.07 + Math.abs(p.return) / 18)})`
                                        : `rgba(229,140,170,${Math.min(0.55, 0.07 + Math.abs(p.return) / 18)})`,
                                    color:
                                      p.return >= 0 ? "#92e0c7" : "#f0abc0",
                                  }
                                : {}
                            }
                          >
                            {p ? formatPercent(p.return) : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!years.length && (
              <div className="empty">
                Monthly returns appear after history loads.
              </div>
            )}
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">RETURN DISTRIBUTION</span>
              <h2>Good days. Difficult days.</h2>
              <p>Frequency of daily observation returns.</p>
            </div>
          </div>
          <div className="analysis-chart">
            <Bar
              options={options}
              data={{
                labels: bucketLabels,
                datasets: [
                  {
                    label: "Observations",
                    data: histogram,
                    backgroundColor: bucketLabels.map((_, i) =>
                      i < 5 ? "#a96b84" : "#59a88f",
                    ),
                    borderRadius: 4,
                  },
                ],
              }}
            />
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">CURRENT POSITIONS</span>
              <h2>What’s contributing to your P&L?</h2>
              <p>
                Unrealized P&L in {currency}; reflects all acquisitions, not the
                selected period.
              </p>
            </div>
          </div>
          <div className="analysis-chart">
            <Bar
              options={{ ...options, indexAxis: "y" }}
              data={{
                labels: summary.holdings.map((h) => h.symbol),
                datasets: [
                  {
                    label: `Unrealized P&L (${currency})`,
                    data: summary.holdings.map((h) =>
                      h.value === null ? null : h.value - h.cost,
                    ),
                    backgroundColor: summary.holdings.map((h) =>
                      h.value !== null && h.value >= h.cost
                        ? "#59a88f"
                        : "#a96b84",
                    ),
                    borderRadius: 4,
                  },
                ],
              }}
            />
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">CAPITAL VS GROWTH</span>
              <h2>What built your portfolio?</h2>
              <p>Separate your contributions from investment gains.</p>
            </div>
          </div>
          <div className="analysis-chart">
            <Line
              options={options}
              data={{
                labels: history.map((p) => p.date),
                datasets: [
                  {
                    label: `Net contributed (${currency})`,
                    data: history.map((p) => p.net),
                    borderColor: "#68778f",
                    backgroundColor: "rgba(104,119,143,.12)",
                    fill: true,
                  },
                  {
                    label: `Investment P&L (${currency})`,
                    data: history.map((p) => p.value - p.net),
                    borderColor: "#b6a0ff",
                    backgroundColor: "rgba(182,160,255,.08)",
                    fill: true,
                  },
                ],
              }}
            />
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">YOUR SAVING HABIT</span>
              <h2>Monthly net contributions</h2>
              <p>Purchases less sale proceeds; first selected day excluded.</p>
            </div>
          </div>
          <div className="analysis-chart">
            <Bar
              options={options}
              data={{
                labels: [...flows.keys()],
                datasets: [
                  {
                    label: `Net flow (${currency})`,
                    data: [...flows.values()],
                    backgroundColor: "#7f8fc7",
                    borderRadius: 3,
                  },
                ],
              }}
            />
          </div>
        </section>
        <section className="card correlation-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">DIVERSIFICATION</span>
              <h2>Do your assets move together?</h2>
              <p>
                Correlation of common-date returns in {currency} ·{" "}
                {correlations.observations} observations · first 10 holdings.
              </p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="correlation">
              <thead>
                <tr>
                  <th />
                  {symbols.map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbols.map((s, i) => (
                  <tr key={s}>
                    <th>{s}</th>
                    {symbols.map((b, j) => {
                      const value = correlations.values[i]?.[j];
                      return (
                        <td key={b}>
                          <span
                            style={
                              value === null || value === undefined
                                ? {}
                                : {
                                    background: `rgba(${value >= 0 ? "182,160,255" : "87,207,173"},${Math.abs(value) * 0.38})`,
                                  }
                            }
                          >
                            {value === null || value === undefined
                              ? "—"
                              : value.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            +1 moves together; 0 indicates no linear relationship; −1 moves
            oppositely. Uses only common dates, never forward-filled returns.
          </p>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">EXPOSURE</span>
              <h2>Asset classes & listing currencies</h2>
              <p>Current holdings, independent of chart selection.</p>
            </div>
          </div>
          <div className="exposure-columns">
            {[classes, currencies].map((group, i) => (
              <div key={i}>
                <h3>{i ? "Listing currency" : "Asset class"}</h3>
                {[...group].map(([label, value], j) => (
                  <div className="exposure-row" key={label}>
                    <span>{label}</span>
                    <strong>
                      {summary.value
                        ? ((value / summary.value) * 100).toFixed(1)
                        : "0"}
                      %
                    </strong>
                    <div>
                      <i
                        style={{
                          width:
                            (summary.value
                              ? (value / summary.value) * 100
                              : 0) + "%",
                          background: COLORS[j % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="note">
            A fund’s trading currency or listing exchange does not reveal its
            underlying geographic or currency exposure. Fund look-through data
            is not assumed.
          </p>
        </section>
      </div>
      <div className="insight-note">
        <ShieldCheck size={18} />
        <p>
          {summary.holdings.length
            ? `Largest position: ${Math.max(...summary.holdings.map((h) => (summary.value ? ((h.value || 0) / summary.value) * 100 : 0))).toFixed(1)}%. Effective number of positions: ${summary.value ? (1 / summary.holdings.reduce((s, h) => s + ((h.value || 0) / summary.value) ** 2, 0)).toFixed(1) : "—"}. `
            : ""}
          Portfolio returns exclude unrecorded cash dividends. Benchmarks follow
          their provider series; the DAX performance index includes dividend
          reinvestment, and ETF prices reflect the fund’s distribution policy.
          Risk metrics describe the selected historical observations, not future
          outcomes.
        </p>
      </div>
    </>
  );
}
