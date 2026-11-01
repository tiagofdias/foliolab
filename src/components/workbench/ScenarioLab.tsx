import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Download,
  ArrowRight,
  FlaskConical,
} from "lucide-react";
import { ledger, timeline, substitute } from "../../../shared/finance.mjs";
import {
  periodMetrics,
  simulateRules,
  previousPoint,
  type HistoryPoint,
} from "../../../shared/analytics.mjs";
import type {
  Portfolio,
  PortfolioActivity,
  SubstitutionRule,
} from "../../types";
import { formatMoney, formatPercent, labelFor } from "../../data/catalog";
import { ExplorerChart, type DateWindow } from "./ExplorerChart";
import { Metric } from "./PortfolioAnalytics";
import { AssetSearch } from "./AssetSearch";
export interface SavedScenario {
  id: string;
  name: string;
  scope: string;
  rules: SubstitutionRule[];
}
interface Props {
  trades: PortfolioActivity[];
  quotes: Record<string, any>;
  portfolios: Portfolio[];
  currency: string;
  scope: string;
  initialSource: string;
  demo: boolean;
  onSymbolsChange: (symbols: string[]) => void;
  saved: SavedScenario[];
  onSave: (scenarios: SavedScenario[]) => void;
  busy: boolean;
}
export function ScenarioLab({
  trades,
  quotes,
  portfolios,
  currency,
  scope,
  initialSource,
  demo,
  onSymbolsChange,
  saved,
  onSave,
  busy,
}: Props) {
  const [mode, setMode] = useState("Substitution"),
    [simScope, setSimScope] = useState(scope),
    [rules, setRules] = useState<SubstitutionRule[]>([]),
    [name, setName] = useState(""),
    [compareA, setCompareA] = useState("ALL"),
    [compareB, setCompareB] = useState(portfolios[0]?.id || "ALL"),
    [window, setWindow] = useState<DateWindow | null>(null);
  useEffect(() => setSimScope(scope), [scope]);
  const scoped = trades.filter(
      (t) => simScope === "ALL" || t.portfolioId === simScope,
    ),
    symbols = [...new Set(scoped.map((t) => t.symbol))];
  useEffect(() => {
    if (initialSource) {
      setMode("Substitution");
      setRules([
        {
          id: crypto.randomUUID(),
          sourceSymbol: initialSource,
          targetSymbol: initialSource === "VWCE.DE" ? "SXR8.DE" : "VWCE.DE",
          enabled: true,
          swapPercentage: 100,
        },
      ]);
    }
  }, [initialSource]);
  useEffect(() => {
    if (!rules.length && symbols.length)
      setRules([
        {
          id: crypto.randomUUID(),
          sourceSymbol: symbols[0],
          targetSymbol: symbols[0] === "VWCE.DE" ? "SXR8.DE" : "VWCE.DE",
          swapPercentage: 100,
          enabled: true,
        },
      ]);
  }, [symbols.join(","), rules.length]);
  const targetKey = rules
    .filter((r) => r.enabled)
    .map((r) => r.targetSymbol)
    .sort()
    .join(",");
  useEffect(
    () => onSymbolsChange(targetKey.split(",").filter(Boolean)),
    [targetKey, onSymbolsChange],
  );
  const baseline = useMemo(
    () => timeline(scoped, quotes),
    [trades, quotes, simScope],
  );
  const result = useMemo(() => {
    try {
      if (!scoped.length) return { trades: [], history: [], error: "" };
      const t = simulateRules(scoped, quotes, rules, substitute);
      const h = timeline(t, quotes);
      return {
        trades: t,
        history: h,
        error: h.length
          ? ""
          : "Complete source and target history is required for every trade.",
      };
    } catch (e) {
      return { trades: [], history: [], error: (e as Error).message };
    }
  }, [trades, quotes, rules, simScope]);
  const selected = (h: HistoryPoint[]) =>
    h.filter(
      (p) => !window || (p.date >= window.start && p.date <= window.end),
    );
  const a = periodMetrics(selected(baseline)),
    b = periodMetrics(selected(result.history));
  const summary = ledger(scoped, quotes);
  function updateRule(id: string, patch: Partial<SubstitutionRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function exportScenario() {
    const rows = [
      "date,actual_value,scenario_value,difference,actual_return_pct,scenario_return_pct",
    ];
    for (const p of baseline) {
      const alt = previousPoint(result.history, p.date);
      if (alt)
        rows.push(
          [
            p.date,
            p.value,
            alt.value,
            alt.value - p.value,
            p.return,
            alt.return,
          ].join(","),
        );
    }
    download(rows.join("\n"), "folio-scenario.csv", "text/csv");
  }
  const compareHistoryA = timeline(
      trades.filter((t) => compareA === "ALL" || t.portfolioId === compareA),
      quotes,
    ),
    compareHistoryB = timeline(
      trades.filter((t) => compareB === "ALL" || t.portfolioId === compareB),
      quotes,
    );
  return (
    <>
      <div className="lab-intro">
        <div className="lab-intro-icon">
          <FlaskConical size={25} />
        </div>
        <div>
          <span className="eyebrow">
            EXPERIMENT WITHOUT CHANGING YOUR PORTFOLIO
          </span>
          <h2>Different choices. Clearer possibilities.</h2>
          <p>
            Replay actual transactions, compare portfolios, or build a plan.
            Every assumption stays visible.
          </p>
        </div>
      </div>
      <div className="lab-tabs">
        {["Substitution", "Compare portfolios", "Future plan", "Rebalance"].map(
          (v) => (
            <button
              key={v}
              className={mode === v ? "selected" : ""}
              onClick={() => setMode(v)}
            >
              {v}
            </button>
          ),
        )}
      </div>
      {mode === "Substitution" && (
        <>
          <div className="lab-layout">
            <section className="card rule-panel">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">01 / SET THE EXPERIMENT</span>
                  <h2>Replay your investments</h2>
                </div>
              </div>
              <div className="rule-content">
                <label>
                  Portfolio scope
                  <select
                    value={simScope}
                    onChange={(e) => setSimScope(e.target.value)}
                  >
                    <option value="ALL">All portfolios</option>
                    {portfolios.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  Choose how much of each asset to replace. Purchases keep their
                  original dates and invested amounts; sales remove a
                  proportional hypothetical holding.
                </p>
                {rules.map((r, i) => (
                  <div
                    className={
                      "substitution-rule " + (!r.enabled ? "disabled-rule" : "")
                    }
                    key={r.id}
                  >
                    <div className="rule-top">
                      <span>RULE {String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <label className="check-label">
                          <input
                            aria-label={"Enable rule " + (i + 1)}
                            type="checkbox"
                            checked={r.enabled}
                            onChange={(e) =>
                              updateRule(r.id, { enabled: e.target.checked })
                            }
                          />
                          Active
                        </label>
                        <button
                          aria-label={"Delete rule " + (i + 1)}
                          className="icon-button"
                          onClick={() =>
                            setRules((prev) =>
                              prev.filter((a) => a.id !== r.id),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <label>
                      Replace
                      <select
                        value={r.sourceSymbol}
                        onChange={(e) =>
                          updateRule(r.id, { sourceSymbol: e.target.value })
                        }
                      >
                        {symbols.map((s) => (
                          <option key={s} value={s}>
                            {s} · {labelFor(s)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="rule-arrow">
                      <ArrowRight size={16} />
                      <span>with</span>
                    </div>
                    <label>
                      Alternative asset
                      <input
                        aria-label={"Target symbol rule " + (i + 1)}
                        value={r.targetSymbol}
                        placeholder="VWCE.DE, QQQ, ASML.AS…"
                        maxLength={24}
                        onChange={(e) =>
                          updateRule(r.id, {
                            targetSymbol: e.target.value.trim().toUpperCase(),
                          })
                        }
                      />
                    </label>
                    <AssetSearch
                      demo={demo}
                      placeholder="Find another asset…"
                      onSelect={(a) =>
                        updateRule(r.id, { targetSymbol: a.symbol })
                      }
                    />
                    <label className="slider-label">
                      Allocation replaced <strong>{r.swapPercentage}%</strong>
                      <input
                        aria-label={"Replacement percentage rule " + (i + 1)}
                        type="range"
                        min="0"
                        max="100"
                        value={r.swapPercentage}
                        onChange={(e) =>
                          updateRule(r.id, { swapPercentage: +e.target.value })
                        }
                      />
                    </label>
                  </div>
                ))}
                <button
                  className="secondary full"
                  disabled={rules.length >= 8 || !symbols.length}
                  onClick={() => {
                    const source =
                      symbols.find(
                        (s) => !rules.some((r) => r.sourceSymbol === s),
                      ) || symbols[0];
                    setRules([
                      ...rules,
                      {
                        id: crypto.randomUUID(),
                        sourceSymbol: source,
                        targetSymbol:
                          source === "VWCE.DE" ? "SXR8.DE" : "VWCE.DE",
                        enabled: true,
                        swapPercentage: 100,
                      },
                    ]);
                  }}
                >
                  <Plus size={15} />
                  Add substitution rule
                </button>
                <div className="save-scenario">
                  <label>
                    Scenario name
                    <input
                      maxLength={80}
                      value={name}
                      placeholder="e.g. More global, less tech"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <button
                    className="primary full"
                    disabled={!name.trim() || busy || saved.length >= 20}
                    onClick={() => {
                      onSave([
                        ...saved,
                        {
                          id: crypto.randomUUID(),
                          name: name.trim(),
                          scope: simScope,
                          rules,
                        },
                      ]);
                      setName("");
                    }}
                  >
                    <Save size={14} />
                    Save scenario
                  </button>
                </div>
                {saved.length > 0 && (
                  <div className="saved-scenarios">
                    <span className="eyebrow">SAVED EXPERIMENTS</span>
                    {saved.map((s) => (
                      <div key={s.id}>
                        <button
                          onClick={() => {
                            setRules(s.rules);
                            setSimScope(
                              portfolios.some((p) => p.id === s.scope)
                                ? s.scope
                                : "ALL",
                            );
                            setWindow(null);
                          }}
                        >
                          {s.name}
                          <small>{s.rules.length} rules</small>
                        </button>
                        <button
                          aria-label={"Delete scenario " + s.name}
                          className="icon-button"
                          disabled={busy}
                          onClick={() =>
                            onSave(saved.filter((a) => a.id !== s.id))
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            <div className="lab-results">
              {result.error && (
                <div className="inline-warning">{result.error}</div>
              )}
              <div className="scenario-headline">
                <span className="eyebrow">
                  HYPOTHETICAL DIFFERENCE · SELECTED PERIOD END
                </span>
                <strong
                  className={
                    a && b && b.endValue >= a.endValue ? "positive" : "negative"
                  }
                >
                  {a && b
                    ? formatMoney(b.endValue - a.endValue, currency)
                    : "History required"}
                </strong>
                <p>
                  {a && b
                    ? `${formatPercent(b.return - a.return)} return advantage over your actual portfolio`
                    : "Add trades and fetch complete source and target histories."}
                </p>
              </div>
              <ExplorerChart
                history={baseline}
                currency={currency}
                comparisons={[
                  {
                    symbol: "scenario",
                    label: "What-if scenario",
                    kind: "scenario",
                    color: "#57cfad",
                    points: result.history.map((p) => ({
                      date: p.date,
                      value: p.value,
                      index: 100 + p.return,
                      net: p.net,
                    })),
                  },
                ]}
                title="Actual vs your experiment"
                resetKey={simScope + currency}
                onWindowChange={setWindow}
              />
              <section className="card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">THE TRADE-OFFS</span>
                    <h2>Return is only part of the story</h2>
                  </div>
                  <button
                    className="secondary"
                    disabled={!result.history.length}
                    onClick={exportScenario}
                  >
                    <Download size={14} />
                    CSV
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Selected-period metric</th>
                        <th>Actual portfolio</th>
                        <th>What-if scenario</th>
                        <th>Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a && b ? (
                        [
                          [
                            "End value",
                            formatMoney(a.endValue, currency),
                            formatMoney(b.endValue, currency),
                            formatMoney(b.endValue - a.endValue, currency),
                          ],
                          [
                            "Investment P&L",
                            formatMoney(a.profit, currency),
                            formatMoney(b.profit, currency),
                            formatMoney(b.profit - a.profit, currency),
                          ],
                          [
                            "Time-weighted return",
                            formatPercent(a.return),
                            formatPercent(b.return),
                            formatPercent(b.return - a.return),
                          ],
                          [
                            "Maximum drawdown",
                            formatPercent(a.drawdown),
                            formatPercent(b.drawdown),
                            formatPercent(b.drawdown - a.drawdown),
                          ],
                          [
                            "Annualized volatility",
                            formatPercent(a.volatility),
                            formatPercent(b.volatility),
                            formatPercent(b.volatility - a.volatility),
                          ],
                          [
                            "Sharpe (0% risk-free)",
                            a.sharpe?.toFixed(2) || "—",
                            b.sharpe?.toFixed(2) || "—",
                            a.sharpe !== null && b.sharpe !== null
                              ? (b.sharpe - a.sharpe).toFixed(2)
                              : "—",
                          ],
                          [
                            "Annualized return",
                            formatPercent(a.annualReturn),
                            formatPercent(b.annualReturn),
                            a.annualReturn !== null && b.annualReturn !== null
                              ? formatPercent(b.annualReturn - a.annualReturn)
                              : "—",
                          ],
                        ].map((row) => (
                          <tr key={row[0]}>
                            {row.map((cell, i) => (
                              <td key={i}>{cell}</td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4}>
                            Complete histories are required to calculate
                            comparisons.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">
                      TRANSACTION-LEVEL TRANSPARENCY
                    </span>
                    <h2>How purchases would change</h2>
                    <p>
                      All acquisitions in the simulation scope; prices and fees
                      expressed in {currency}.
                    </p>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Original asset</th>
                        <th>Alternative</th>
                        <th>Reallocated</th>
                        <th>Alternative units</th>
                        <th>Historical price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoped
                        .filter(
                          (t) =>
                            t.type === "BUY" &&
                            rules.some(
                              (r) => r.enabled && r.sourceSymbol === t.symbol,
                            ),
                        )
                        .map((t) => {
                          const r = rules.find(
                              (r) => r.enabled && r.sourceSymbol === t.symbol,
                            )!,
                            price = previousPoint(
                              quotes[r.targetSymbol]?.history,
                              t.date,
                            )?.price,
                            cash =
                              (t.quantity * t.unitPrice * r.swapPercentage) /
                              100;
                          return (
                            <tr key={t.id}>
                              <td>{t.date}</td>
                              <td>{t.symbol}</td>
                              <td>{r.targetSymbol}</td>
                              <td>{formatMoney(cash, currency)}</td>
                              <td>
                                {price
                                  ? (cash / price).toFixed(5)
                                  : "Unavailable"}
                              </td>
                              <td>
                                {price
                                  ? formatMoney(price, currency)
                                  : "Unavailable"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
          <div className="insight-note">
            <FlaskConical size={18} />
            <p>
              Rules apply to original assets without cascading. Trades use the
              last available close on or before their date; never a future
              price. Different sale proceeds are external withdrawals. Fees stay
              constant in reporting currency. Dividends, taxes and slippage are
              excluded. Hypothetical history is not a forecast.
            </p>
          </div>
        </>
      )}
      {mode === "Compare portfolios" && (
        <>
          <section className="card compare-controls">
            <div className="card-heading">
              <div>
                <span className="eyebrow">SIDE BY SIDE</span>
                <h2>Different portfolios. The same lens.</h2>
                <p>
                  Return mode removes size differences. Value mode shows actual
                  portfolio sizes.
                </p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Portfolio A
                <select
                  value={compareA}
                  onChange={(e) => setCompareA(e.target.value)}
                >
                  <option value="ALL">All portfolios</option>
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Portfolio B
                <select
                  value={compareB}
                  onChange={(e) => setCompareB(e.target.value)}
                >
                  <option value="ALL">All portfolios</option>
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <ExplorerChart
            history={compareHistoryA.filter(
              (p) => p.date >= (compareHistoryB[0]?.date || ""),
            )}
            currency={currency}
            comparisons={[
              {
                symbol: compareB,
                label:
                  portfolios.find((p) => p.id === compareB)?.name ||
                  "All portfolios",
                color: "#57cfad",
                kind: "scenario",
                points: compareHistoryB.map((p) => ({
                  date: p.date,
                  value: p.value,
                  index: 100 + p.return,
                  net: p.net,
                })),
              },
            ]}
            title={`${portfolios.find((p) => p.id === compareA)?.name || "All portfolios"} vs ${portfolios.find((p) => p.id === compareB)?.name || "All portfolios"}`}
            resetKey={compareA + compareB + currency}
          />
        </>
      )}
      {mode === "Future plan" && (
        <Projection
          initial={summary.complete ? summary.value : 0}
          currency={currency}
        />
      )}{" "}
      {mode === "Rebalance" && (
        <Rebalance summary={summary} currency={currency} />
      )}
    </>
  );
}
function Projection({
  initial,
  currency,
}: {
  initial: number;
  currency: string;
}) {
  const [monthly, setMonthly] = useState(500),
    [years, setYears] = useState(15),
    [rate, setRate] = useState(6),
    [inflation, setInflation] = useState(2),
    [annualFee, setAnnualFee] = useState(0.2),
    [step, setStep] = useState(2),
    [starting, setStarting] = useState<number | null>(null);
  const amount = starting ?? initial;
  const project = (annual: number) => {
    let balance = amount,
      contributed = amount;
    const rows = [{ date: "Today", value: balance, net: contributed }];
    for (let i = 1; i <= years * 12; i++) {
      const deposit = monthly * (1 + step / 100) ** Math.floor((i - 1) / 12);
      balance =
        balance *
          (1 + annual / 100) ** (1 / 12) *
          (1 - annualFee / 100) ** (1 / 12) +
        deposit;
      contributed += deposit;
      if (i % 12 === 0)
        rows.push({ date: `Year ${i / 12}`, value: balance, net: contributed });
    }
    return rows;
  };
  const expected = project(rate),
    low = project(Math.max(-50, rate - 4)),
    high = project(Math.min(50, rate + 4)),
    last = expected.at(-1)!;
  return (
    <div className="lab-layout">
      <section className="card rule-panel">
        <div className="card-heading">
          <div>
            <span className="eyebrow">ASSUMPTIONS, NOT PROMISES</span>
            <h2>Build your future plan</h2>
          </div>
        </div>
        <div className="rule-content">
          {[
            ["Starting capital", amount, setStarting, 0, 1e9],
            ["Monthly contribution", monthly, setMonthly, 0, 1e6],
            ["Years", years, setYears, 1, 50],
            ["Expected annual return (%)", rate, setRate, -50, 50],
            ["Inflation (%)", inflation, setInflation, 0, 20],
            ["Annual fee (%)", annualFee, setAnnualFee, 0, 10],
            ["Annual contribution increase (%)", step, setStep, 0, 20],
          ].map(([label, value, setter, min, max]) => (
            <label key={String(label)}>
              {String(label)}
              <input
                type="number"
                min={Number(min)}
                max={Number(max)}
                step={label === "Years" ? 1 : 0.1}
                value={Number(value)}
                onChange={(e) =>
                  (setter as (v: number) => void)(
                    Math.max(
                      Number(min),
                      Math.min(Number(max), Number(e.target.value)),
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
      </section>
      <div className="lab-results">
        <div className="metric-grid projection-metrics">
          <Metric
            label="Nominal future value"
            value={formatMoney(last.value, currency)}
            detail={`${years} years · ${rate}% assumed annual return`}
          />
          <Metric
            label="In today’s money"
            value={formatMoney(
              last.value / (1 + inflation / 100) ** years,
              currency,
            )}
            detail={`${inflation}% annual inflation assumption`}
          />
          <Metric
            label="Total capital contributed"
            value={formatMoney(last.net, currency)}
            detail="Starting amount + monthly deposits"
          />
          <Metric
            label="Investment growth"
            value={formatMoney(last.value - last.net, currency)}
            detail="After the assumed annual fee"
          />
        </div>
        <ProjectionChart
          rows={expected}
          low={low}
          high={high}
          currency={currency}
        />
        <p className="note">
          The lower and upper lines use assumed returns four percentage points
          below and above your central assumption. They are illustrative
          scenarios, not probability bounds. Contributions occur at month end;
          no taxes or dividends are modeled separately.
        </p>
      </div>
    </div>
  );
}
import { Line } from "react-chartjs-2";
function ProjectionChart({
  rows,
  low,
  high,
  currency,
}: {
  rows: { date: string; value: number; net: number }[];
  low: { value: number }[];
  high: { value: number }[];
  currency: string;
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">LONG-TERM VIEW</span>
          <h2>The potential of consistency</h2>
        </div>
      </div>
      <div className="projection-chart">
        <Line
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { position: "bottom" } },
            elements: { point: { radius: 0 } },
            scales: {
              x: { grid: { display: false } },
              y: {
                ticks: {
                  callback: (v) =>
                    new Intl.NumberFormat("en-IE", {
                      style: "currency",
                      currency,
                      notation: "compact",
                    }).format(Number(v)),
                },
              },
            },
          }}
          data={{
            labels: rows.map((p) => p.date),
            datasets: [
              {
                label: "Central assumption",
                data: rows.map((p) => p.value),
                borderColor: "#b6a0ff",
                backgroundColor: "rgba(182,160,255,.08)",
                fill: true,
              },
              {
                label: "Lower return assumption",
                data: low.map((p) => p.value),
                borderColor: "#e58caa",
                borderDash: [4, 4],
              },
              {
                label: "Higher return assumption",
                data: high.map((p) => p.value),
                borderColor: "#57cfad",
                borderDash: [4, 4],
              },
              {
                label: "Contributed capital",
                data: rows.map((p) => p.net),
                borderColor: "#788398",
                borderDash: [3, 5],
              },
            ],
          }}
        />
      </div>
    </section>
  );
}
function Rebalance({
  summary,
  currency,
}: {
  summary: ReturnType<typeof ledger>;
  currency: string;
}) {
  const [targets, setTargets] = useState<Record<string, number>>({}),
    [cash, setCash] = useState(0),
    [fee, setFee] = useState(1);
  const total = summary.holdings.reduce(
      (s, h) =>
        s +
        (targets[h.symbol] ??
          (summary.value ? ((h.value || 0) / summary.value) * 100 : 0)),
      0,
    ),
    valid =
      summary.complete && Math.abs(total - 100) < 0.05 && summary.value > 0;
  const rows = summary.holdings.map((h) => {
    const weight =
        targets[h.symbol] ??
        (summary.value ? ((h.value || 0) / summary.value) * 100 : 0),
      delta = ((summary.value + cash) * weight) / 100 - (h.value || 0);
    return {
      symbol: h.symbol,
      current: summary.value ? ((h.value || 0) / summary.value) * 100 : 0,
      weight,
      delta,
      units: h.price ? delta / h.price : 0,
    };
  });
  const fees = rows.filter((r) => Math.abs(r.delta) > 0.01).length * fee;
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">PLAN YOUR NEXT MOVE</span>
          <h2>Rebalance with new contributions</h2>
          <p>
            Compare current and target weights. Add cash to reduce the need to
            sell.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() =>
            setTargets(
              Object.fromEntries(
                summary.holdings.map((h) => [
                  h.symbol,
                  100 / summary.holdings.length,
                ]),
              ),
            )
          }
        >
          Equal weight
        </button>
      </div>
      <div className="rebalance-inputs">
        <label>
          New cash ({currency})
          <input
            type="number"
            min="0"
            max="100000000"
            value={cash}
            onChange={(e) =>
              setCash(Math.max(0, Math.min(1e8, +e.target.value)))
            }
          />
        </label>
        <label>
          Estimated fee per order ({currency})
          <input
            type="number"
            min="0"
            max="1000"
            step=".1"
            value={fee}
            onChange={(e) =>
              setFee(Math.max(0, Math.min(1000, +e.target.value)))
            }
          />
        </label>
        <div
          className={
            valid ? "allocation-total positive" : "allocation-total negative"
          }
        >
          Target total <strong>{total.toFixed(2)}%</strong>
          <small>
            {valid
              ? "Allocation adds up"
              : "Targets must total 100%; all prices required"}
          </small>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Current weight</th>
              <th>Target %</th>
              <th>Planned action</th>
              <th>Amount</th>
              <th>Approx. units</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol}>
                <td>{r.symbol}</td>
                <td>{r.current.toFixed(2)}%</td>
                <td>
                  <input
                    aria-label={r.symbol + " target weight"}
                    className="weight-input"
                    type="number"
                    min="0"
                    max="100"
                    step=".1"
                    value={+r.weight.toFixed(2)}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        [r.symbol]: Math.max(0, Math.min(100, +e.target.value)),
                      })
                    }
                  />
                </td>
                <td className={r.delta >= 0 ? "positive" : "negative"}>
                  {valid
                    ? Math.abs(r.delta) < 0.01
                      ? "HOLD"
                      : r.delta > 0
                        ? "BUY"
                        : "SELL"
                    : "—"}
                </td>
                <td>
                  {valid ? formatMoney(Math.abs(r.delta), currency) : "—"}
                </td>
                <td>{valid ? Math.abs(r.units).toFixed(5) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rebalance-footer">
        <p>
          Estimated order fees: {formatMoney(fees, currency)}. Fees are
          additional cash required; the allocation amounts do not deduct them.
          Fractional shares assumed. No orders are executed.
        </p>
        <button
          className="secondary"
          disabled={!valid}
          onClick={() =>
            download(
              "symbol,action,amount,units\n" +
                rows
                  .map((r) =>
                    [
                      r.symbol,
                      r.delta >= 0 ? "BUY" : "SELL",
                      Math.abs(r.delta),
                      Math.abs(r.units),
                    ].join(","),
                  )
                  .join("\n"),
              "folio-rebalance.csv",
              "text/csv",
            )
          }
        >
          <Download size={14} />
          Export plan
        </button>
      </div>
    </section>
  );
}
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
