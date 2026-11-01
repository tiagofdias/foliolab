import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type Plugin,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  MousePointer2,
  RotateCcw,
  Maximize2,
  CalendarRange,
  Activity,
} from "lucide-react";
import {
  periodMetrics,
  previousPoint,
  type HistoryPoint,
} from "../../../shared/analytics.mjs";
import { formatMoney, formatPercent } from "../../data/catalog";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);
ChartJS.defaults.color = "#8c94aa";
ChartJS.defaults.borderColor = "#252a3b";
ChartJS.defaults.font.family = "Inter, system-ui, sans-serif";
export interface Comparison {
  symbol: string;
  label: string;
  color: string;
  kind: "benchmark" | "scenario";
  points: {
    date: string;
    value: number | null;
    index?: number;
    net?: number;
  }[];
}
export interface DateWindow {
  start: string;
  end: string;
}
interface Props {
  history: HistoryPoint[];
  currency: string;
  comparisons?: Comparison[];
  title?: string;
  onWindowChange?: (window: DateWindow | null) => void;
  defaultMetric?: string;
  resetKey?: string;
  showFeedback?: boolean;
}
export function ExplorerChart({
  history,
  currency,
  comparisons = [],
  title = "Performance",
  onWindowChange,
  defaultMetric = "return",
  resetKey = "",
  showFeedback = true,
}: Props) {
  const chartRef = useRef<ChartJS<"line">>(null),
    pointerStart = useRef<number | null>(null),
    shade = useRef<{ a: number; b: number } | null>(null);
  const [range, setRange] = useState("1Y"),
    [metric, setMetric] = useState(defaultMetric),
    [selection, setSelection] = useState<DateWindow | null>(null),
    [dragging, setDragging] = useState(false),
    [custom, setCustom] = useState<DateWindow | null>(null);
  const last = history.at(-1)?.date || new Date().toISOString().slice(0, 10),
    first = history[0]?.date || last;
  useEffect(() => {
    setSelection(null);
    setCustom(null);
    setRange("1Y");
  }, [resetKey]);
  const view = useMemo(() => {
    let start = first;
    if (custom) start = custom.start;
    else if (range === "YTD") start = last.slice(0, 4) + "-01-01";
    else if (range !== "ALL") {
      const days =
        { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "3Y": 1095 }[range] || 365;
      start = new Date(Date.parse(last) - days * 86400000)
        .toISOString()
        .slice(0, 10);
    }
    return history.filter(
      (p) => p.date >= start && p.date <= (custom?.end || last),
    );
  }, [history, custom, range, first, last]);
  const selected = view.filter(
    (p) => !selection || (p.date >= selection.start && p.date <= selection.end),
  );
  const stats = periodMetrics(selected);
  const startDate = selected[0]?.date,
    endDate = selected.at(-1)?.date;
  useEffect(() => {
    onWindowChange?.(
      startDate && endDate ? { start: startDate, end: endDate } : null,
    );
  }, [startDate, endDate, onWindowChange]);
  const selectedIndices = selection
    ? {
        a: view.findIndex((p) => p.date >= selection.start),
        b: view.findLastIndex((p) => p.date <= selection.end),
      }
    : null;
  if (!dragging) shade.current = selectedIndices;
  const selectionPlugin = useMemo<Plugin<"line">>(
    () => ({
      id: "folio-selection",
      afterDraw(chart) {
        const s = shade.current;
        if (!s || s.a < 0 || s.b < 0) return;
        const { ctx, chartArea, scales } = chart;
        const left = scales.x.getPixelForValue(Math.min(s.a, s.b)),
          right = scales.x.getPixelForValue(Math.max(s.a, s.b));
        ctx.save();
        ctx.fillStyle = "rgba(182,160,255,.12)";
        ctx.fillRect(
          left,
          chartArea.top,
          Math.max(2, right - left),
          chartArea.bottom - chartArea.top,
        );
        ctx.strokeStyle = "#b6a0ff";
        ctx.setLineDash([4, 4]);
        for (const x of [left, right]) {
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();
        }
        ctx.restore();
      },
    }),
    [],
  );
  const portfolioBase = view.length ? 100 + view[0].return : 100;
  const normalized = view.map((p) =>
    portfolioBase > 0 ? ((100 + p.return) / portfolioBase - 1) * 100 : 0,
  );
  let peak = 100;
  const data = {
    labels: view.map((p) => p.date),
    datasets: [
      {
        label: "Your portfolio",
        data: view.map((p, i) => {
          if (metric === "value") return p.value;
          if (metric === "profit") return p.value - p.net;
          if (metric === "drawdown") {
            const value = 100 + normalized[i];
            peak = Math.max(peak, value);
            return (value / peak - 1) * 100;
          }
          return normalized[i];
        }),
        borderColor: "#b6a0ff",
        backgroundColor:
          metric === "drawdown"
            ? "rgba(229,140,170,.08)"
            : "rgba(182,160,255,.08)",
        fill: comparisons.length === 0,
        tension: 0.12,
        borderWidth: 2.2,
      },
      ...(metric === "value"
        ? [
            {
              label: "Net invested",
              data: view.map((p) => p.net),
              borderColor: "#687287",
              backgroundColor: "transparent",
              fill: false,
              borderDash: [4, 5],
              borderWidth: 1.2,
              tension: 0,
            },
          ]
        : []),
      ...comparisons
        .filter(
          (c) =>
            metric === "return" ||
            metric === "drawdown" ||
            c.kind === "scenario",
        )
        .map((c) => {
          const base = previousPoint(c.points, view[0]?.date);
          const startIndex = base?.index ?? base?.value;
          let peak = 100;
          return {
            label: c.label,
            data: view.map((p) => {
              const point = previousPoint(c.points, p.date);
              if (!point || point.value === null || !(startIndex > 0))
                return null;
              if (metric === "value") return point.value;
              if (metric === "profit")
                return point.value - (point.net ?? p.net);
              const index = point.index ?? point.value;
              const value = (index / startIndex) * 100;
              if (metric === "drawdown") {
                peak = Math.max(peak, value);
                return (value / peak - 1) * 100;
              }
              return value - 100;
            }),
            borderColor: c.color,
            backgroundColor: "transparent",
            fill: false,
            borderWidth: 1.6,
            tension: 0.1,
          };
        }),
    ],
  };
  const percent = metric === "return" || metric === "drawdown";
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    layout: { padding: { top: 12, right: 8 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: !dragging,
        backgroundColor: "#202437",
        borderColor: "#3a4057",
        borderWidth: 1,
        padding: 12,
        titleColor: "#e5e8f1",
        bodyColor: "#a7afc2",
        callbacks: {
          label: (c) =>
            `${c.dataset.label}: ${c.parsed.y === null ? "No data" : percent ? formatPercent(c.parsed.y) : formatMoney(c.parsed.y, currency)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxTicksLimit: 7,
          maxRotation: 0,
          callback: (_, i) =>
            view[i]
              ? new Date(view[i].date + "T12:00:00").toLocaleDateString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    ...(view.length > 500 ? { year: "2-digit" } : {}),
                  },
                )
              : "",
        },
      },
      y: {
        position: "right",
        border: { display: false },
        grid: { color: "#252a3b" },
        ticks: {
          padding: 10,
          maxTicksLimit: 6,
          callback: (v) =>
            percent
              ? `${Number(v).toFixed(0)}%`
              : new Intl.NumberFormat("en-IE", {
                  style: "currency",
                  currency,
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(Number(v)),
        },
      },
    },
    elements: { point: { radius: 0, hitRadius: 14 } },
  };
  function indexAt(event: React.PointerEvent<HTMLCanvasElement>) {
    const chart = chartRef.current;
    if (!chart) return 0;
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(
        view.length - 1,
        Math.round(
          Number(
            chart.scales.x.getValueForPixel(
              ((event.clientX - rect.left) * chart.width) / rect.width,
            ),
          ),
        ),
      ),
    );
  }
  function chooseRange(value: string) {
    setRange(value);
    setCustom(null);
    setSelection(null);
  }
  return (
    <section className="card explorer">
      <div className="card-heading">
        <div>
          <span className="eyebrow">PORTFOLIO EXPLORER</span>
          <h2>{title}</h2>
        </div>
        <div className="segmented" role="group" aria-label="Chart metric">
          {[
            ["return", "Return"],
            ["value", "Value"],
            ["profit", "P&L"],
            ["drawdown", "Drawdown"],
          ].map(([v, label]) => (
            <button
              key={v}
              className={metric === v ? "selected" : ""}
              onClick={() => setMetric(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="explorer-toolbar">
        <div className="range-buttons">
          {["1M", "3M", "6M", "YTD", "1Y", "3Y", "ALL"].map((r) => (
            <button
              key={r}
              className={!custom && range === r ? "selected" : ""}
              onClick={() => chooseRange(r)}
            >
              {r}
            </button>
          ))}
          <button
            aria-label="Custom chart dates"
            className={custom ? "selected" : ""}
            onClick={() => {
              setCustom({
                start: view[0]?.date || first,
                end: view.at(-1)?.date || last,
              });
              setSelection(null);
            }}
          >
            <CalendarRange size={14} />
          </button>
        </div>
        <div className="chart-tools">
          {selection && (
            <>
              <button
                onClick={() => {
                  setCustom(selection);
                  setSelection(null);
                }}
              >
                <Maximize2 size={13} />
                Zoom selection
              </button>
              <button onClick={() => setSelection(null)}>
                <RotateCcw size={13} />
                Clear selection
              </button>
            </>
          )}
          <span>
            <MousePointer2 size={13} />
            Drag to analyse a period
          </span>
        </div>
      </div>
      {custom && (
        <div className="custom-range">
          <label>
            From
            <input
              aria-label="Chart start date"
              type="date"
              min={first}
              max={custom.end}
              value={custom.start}
              onChange={(e) => {
                setCustom({ ...custom, start: e.target.value });
                setSelection(null);
              }}
            />
          </label>
          <label>
            To
            <input
              aria-label="Chart end date"
              type="date"
              min={custom.start}
              max={last}
              value={custom.end}
              onChange={(e) => {
                setCustom({ ...custom, end: e.target.value });
                setSelection(null);
              }}
            />
          </label>
          <button
            onClick={() => {
              setCustom(null);
              setSelection(null);
              setRange("ALL");
            }}
          >
            Reset view
          </button>
        </div>
      )}
      <div className="chart-legend">
        {data.datasets.map((d) => (
          <span key={d.label}>
            <i style={{ background: d.borderColor }} />
            {d.label}
          </span>
        ))}
      </div>
      <div className="explorer-canvas">
        {view.length ? (
          <Line
            ref={chartRef}
            data={data}
            options={options}
            plugins={[selectionPlugin]}
            onPointerDown={(e) => {
              if (e.button !== 0 || view.length < 2) return;
              pointerStart.current = indexAt(e);
              shade.current = {
                a: pointerStart.current,
                b: pointerStart.current,
              };
              setDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
              chartRef.current?.draw();
            }}
            onPointerMove={(e) => {
              if (pointerStart.current === null) return;
              shade.current = { a: pointerStart.current, b: indexAt(e) };
              chartRef.current?.draw();
            }}
            onPointerUp={(e) => {
              if (pointerStart.current === null) return;
              const start = pointerStart.current,
                end = indexAt(e);
              pointerStart.current = null;
              setDragging(false);
              if (Math.abs(end - start) >= 1)
                setSelection({
                  start: view[Math.min(start, end)].date,
                  end: view[Math.max(start, end)].date,
                });
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              pointerStart.current = null;
              setDragging(false);
            }}
          />
        ) : (
          <div className="empty">
            <Activity size={30} />
            <strong>No complete history in this period</strong>
            <span>
              Add transactions or choose a wider range. Every acquisition needs
              price and FX history.
            </span>
          </div>
        )}
      </div>
      {stats && showFeedback && (
        <>
          <div className="selection-heading">
            <span className={selection ? "selection-badge" : "period-badge"}>
              {selection ? "SELECTED PERIOD" : "VISIBLE PERIOD"}
            </span>
            <strong>
              {stats.start} <span>→</span> {stats.end}
            </strong>
            <small>
              {stats.observations} return observations · {currency}
            </small>
          </div>
          <div className="period-grid">
            {[
              ["Return", formatPercent(stats.return)],
              ["Investment P&L", formatMoney(stats.profit, currency)],
              ["Net flows", formatMoney(stats.flows, currency)],
              ["Maximum drawdown", formatPercent(stats.drawdown)],
              ["Volatility / yr", formatPercent(stats.volatility)],
              [
                "Start → end",
                `${formatMoney(stats.startValue, currency)} → ${formatMoney(stats.endValue, currency)}`,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {comparisons.length > 0 && (
            <div className="comparison-results">
              <table>
                <thead>
                  <tr>
                    <th>Compare this period</th>
                    <th>Return</th>
                    <th>Portfolio advantage</th>
                    <th>End value</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c) => {
                    const a = previousPoint(c.points, stats.start),
                      b = previousPoint(c.points, stats.end);
                    const av = a?.index ?? a?.value,
                      bv = b?.index ?? b?.value;
                    const result =
                      av > 0 && bv !== null && bv !== undefined
                        ? (bv / av - 1) * 100
                        : null;
                    return (
                      <tr key={c.symbol}>
                        <td>
                          <span className="legend-label">
                            <i style={{ background: c.color }} />
                            {c.label}
                          </span>
                        </td>
                        <td>{formatPercent(result)}</td>
                        <td
                          className={
                            result !== null && stats.return >= result
                              ? "positive"
                              : "negative"
                          }
                        >
                          {result === null
                            ? "History unavailable"
                            : formatPercent(stats.return - result)}
                        </td>
                        <td>
                          {c.kind === "scenario" &&
                          b?.value !== null &&
                          b?.value !== undefined
                            ? formatMoney(b.value, currency)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <div className="chart-foot">
        <span>
          {percent ? "Returns rebased to visible period · " : ""}Daily price
          history · {currency}
        </span>
        <span>
          {metric === "value" && comparisons.some((c) => c.kind === "benchmark")
            ? "Switch to Return to compare benchmarks"
            : "Date fields offer a keyboard alternative to dragging"}
        </span>
      </div>
    </section>
  );
}
