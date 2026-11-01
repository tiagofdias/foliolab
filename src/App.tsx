import { CURRENCIES } from "../shared/markets.mjs";
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import {
  Plus,
  Layers,
  LayoutDashboard,
  ArrowRightLeft,
  FlaskConical,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  RefreshCw,
  Download,
  ArrowUpRight,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { ledger, timeline, validateWorkspace } from "../shared/finance.mjs";
import { convertData } from "../shared/analytics.mjs";
import type { Portfolio, PortfolioActivity, MarketQuote } from "./types";
import type { SavedScenario } from "./components/workbench/ScenarioLab";
import { AssetSearch } from "./components/workbench/AssetSearch";
import { MarketDataStatus } from "./components/workbench/MarketDataStatus";
import { useLiveFeed } from "./services/useLiveFeed";
import {
  demoWorkspace as sample,
  demoQuotes as sampleQuotes,
  demoFx,
} from "./data/demo";
import { COLORS as colors, formatMoney } from "./data/catalog";
import "./App.css";
type Workspace = {
  portfolios: Portfolio[];
  trades: PortfolioActivity[];
  preferences?: { currency: string; benchmarks: string[] };
  scenarios?: SavedScenario[];
};
type Quote = MarketQuote & {
  asOf?: string;
  source?: string;
  exchange?: string;
  assetClass?: string;
  quality?: string;
  receivedAt?: string;
  fetchedAt?: string;
  historySource?: string;
  liveStatus?: string;
  delay?: number | null;
  bid?: number | null;
  ask?: number | null;
};
const day = () => new Date().toISOString().slice(0, 10);
async function api(path: string, method = "GET", data?: unknown) {
  const r = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  const value = await r.json();
  if (!r.ok) throw Error(value.error || "Request failed");
  return value;
}
const empty: Workspace = { portfolios: [], trades: [] };
const PortfolioAnalytics = lazy(() =>
  import("./components/workbench/PortfolioAnalytics").then((m) => ({
    default: m.PortfolioAnalytics,
  })),
);
const ScenarioLab = lazy(() =>
  import("./components/workbench/ScenarioLab").then((m) => ({
    default: m.ScenarioLab,
  })),
);
export default function App() {
  const [user, setUser] = useState<{ email: string } | null>(null),
    [ready, setReady] = useState(false),
    [demo, setDemo] = useState(false),
    [demoLive, setDemoLive] = useState(false),
    [data, setData] = useState<Workspace>(empty),
    [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [tab, setTab] = useState("Overview"),
    [scope, setScope] = useState("ALL"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [refresh, setRefresh] = useState(0),
    [auth, setAuth] = useState("login");
  const [modal, setModal] = useState<"trade" | "portfolio" | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [search, setSearch] = useState("");
  const [initialSource, setInitialSource] = useState(""),
    [extraSymbols, setExtraSymbols] = useState<string[]>([]),
    [fx, setFx] = useState<Record<string, { date: string; rate: number }[]>>(
      {},
    ),
    [fxError, setFxError] = useState(""),
    [marketError, setMarketError] = useState(""),
    [fxAsOf, setFxAsOf] = useState("");
  const tradeFormRef = useRef<HTMLFormElement>(null);
  const preferences = {
    currency: data.preferences?.currency || "EUR",
    benchmarks: data.preferences?.benchmarks ?? ["^GSPC", "^STOXX50E"],
  };
  const currency = preferences.currency;
  const money = (v: number) => formatMoney(v, currency);
  const fxFrom = [
    new Date(Date.now() - 3660 * 86400000).toISOString().slice(0, 10),
    ...data.trades.map((t) => t.date),
  ].sort()[0];
  useEffect(() => {
    if (demo && !demoLive) {
      setFx(demoFx());
      setFxAsOf(day());
      setFxError("");
      return;
    }
    if (!user && !(demo && demoLive)) return;
    let live = true;
    api("/market/fx?from=" + fxFrom)
      .then((d) => {
        if (live) {
          setFx(d.rates);
          setFxAsOf(d.asOf);
          setFxError("");
        }
      })
      .catch((e) => {
        if (live) setFxError(e.message);
      });
    return () => {
      live = false;
    };
  }, [demo, demoLive, user, fxFrom, refresh]);
  useEffect(() => {
    api("/auth/me")
      .then(async (d) => {
        if (d.user) {
          const w = await api("/workspace");
          setData(w);
          setUser(d.user);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setModal(null);
      if (event.key !== "Tab") return;
      const controls = [
        ...document.querySelectorAll<HTMLElement>(
          '[role="dialog"] button:not(:disabled), [role="dialog"] input, [role="dialog"] select',
        ),
      ];
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [modal, busy]);
  const trades = useMemo(
    () => data.trades.filter((t) => scope === "ALL" || t.portfolioId === scope),
    [data, scope],
  );
  const symbols = [
    ...new Set([
      ...data.trades.map((t) => t.symbol),
      ...preferences.benchmarks,
      ...(tab === "What-if lab" ? extraSymbols : []),
    ]),
  ]
    .sort()
    .join(",");
  const liveStatus = useLiveFeed(
    symbols,
    Boolean(user) || (demo && demoLive),
    setQuotes,
  );
  useEffect(() => {
    if (demo && !demoLive) {
      setQuotes(sampleQuotes());
      return;
    }
    if (!user && !(demo && demoLive)) return;
    let live = true;
    async function update() {
      setLoading(true);
      const results = await Promise.allSettled(
        symbols
          .split(",")
          .filter(Boolean)
          .map(
            async (s) =>
              [s, await api("/market/chart/" + encodeURIComponent(s))] as const,
          ),
      );
      if (!live) return;
      setQuotes((q) => {
        const next = { ...q };
        for (const r of results) {
          if (r.status !== "fulfilled") continue;
          const [symbol, fresh] = r.value,
            previous = q[symbol];
          next[symbol] =
            previous?.quality === "real-time" &&
            ((previous.liveStatus === "connected" &&
              Date.now() - Date.parse(previous.receivedAt || "") < 90000) ||
              Date.parse(previous.asOf || "") > Date.parse(fresh.asOf))
              ? {
                  ...fresh,
                  currentPrice: previous.currentPrice,
                  asOf: previous.asOf,
                  receivedAt: previous.receivedAt,
                  source: previous.source,
                  exchange: previous.exchange,
                  historySource: fresh.historySource || fresh.source,
                  quality: previous.quality,
                  liveStatus: previous.liveStatus,
                  bid: previous.bid,
                  ask: previous.ask,
                  delay: 0,
                }
              : fresh;
        }
        return next;
      });
      const needed = symbols.split(",").filter(Boolean);
      const failed = results.flatMap((r, i) =>
        r.status === "rejected"
          ? [`${needed[i]}: ${r.reason.message || "unavailable"}`]
          : [],
      );
      setMarketError(
        failed.length
          ? `Quote issues: ${failed.join("; ")}. Previous quotes retain their timestamps. Refresh to retry.`
          : "",
      );
      setLoading(false);
    }
    const debounce = setTimeout(update, 450);
    const id = setInterval(update, 60000);
    return () => {
      live = false;
      clearTimeout(debounce);
      clearInterval(id);
    };
  }, [symbols, user, demo, demoLive, refresh]);
  const normalized = useMemo(
    () => convertData(data.trades, quotes, fx, currency),
    [data.trades, quotes, fx, currency],
  );
  const convertedTrades = useMemo(
    () =>
      normalized.trades.filter(
        (t) => scope === "ALL" || t.portfolioId === scope,
      ),
    [normalized.trades, scope],
  );
  const summary = useMemo(
    () =>
      normalized.missing.length
        ? { ...ledger([], {}), complete: false }
        : ledger(convertedTrades, normalized.quotes),
    [convertedTrades, normalized],
  );
  const history = useMemo(
    () =>
      normalized.missing.length
        ? []
        : timeline(convertedTrades, normalized.quotes),
    [convertedTrades, normalized],
  );
  async function save(next: Workspace) {
    setBusy(true);
    setError("");
    try {
      validateWorkspace(next);
      if (!demo) await api("/workspace", "PUT", next);
      setData(next);
      setModal(null);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const u = await api("/auth/" + auth, "POST", {
        email: f.get("email"),
        password: f.get("password"),
      });
      const w = await api("/workspace");
      setUser(u);
      setData(w);
      setQuotes({});
      setDemo(false);
      setDemoLive(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportData() {
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = "folio-lab-backup.json";
    a.click();
    URL.revokeObjectURL(u);
  }
  function open(kind: "trade" | "portfolio", id: string | null = null) {
    setEditing(id);
    setError("");
    setModal(kind);
  }
  if (!ready) return <div className="loading">Opening your workspace…</div>;
  if (!user && !demo)
    return (
      <main className="auth-page">
        <div className="auth-story">
          <Brand />
          <span className="eyebrow">A CLEARER VIEW OF YOUR WEALTH</span>
          <h1>
            Your investments.
            <br />
            The bigger picture.
          </h1>
          <p>
            Track every move, understand your exposure, and explore what comes
            next. One thoughtful home for your portfolio.
          </p>
          <div className="auth-art">
            <ChartNoAxesCombined size={80} />
            <h2>
              Less guesswork.
              <br />
              More perspective.
            </h2>
          </div>
          <small>Free to run. Your data in your own database.</small>
        </div>
        <div className="auth-form">
          <span className="eyebrow">WELCOME TO FOLIO LAB</span>
          <h2>
            {auth === "login"
              ? "Good to have you back."
              : "Make room for your future."}
          </h2>
          <p>Your personal investment workspace starts here.</p>
          <form onSubmit={login}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  auth === "login" ? "current-password" : "new-password"
                }
                required
                minLength={10}
                maxLength={256}
                placeholder="At least 10 characters"
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? "Please wait…"
                : auth === "login"
                  ? "Sign in"
                  : "Create account"}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setAuth(auth === "login" ? "register" : "login");
              setError("");
            }}
          >
            {auth === "login"
              ? "New here? Create an account"
              : "Already registered? Sign in"}
          </button>
          <div className="divider">OR TAKE A LOOK AROUND</div>
          <button
            className="secondary full"
            onClick={() => {
              setDemo(true);
              setData(sample());
              setError("");
            }}
          >
            Explore the interactive demo <ArrowUpRight size={17} />
          </button>
          <small>No account needed. Demo prices are illustrative.</small>
        </div>
      </main>
    );
  const currentTrade = data.trades.find((t) => t.id === editing),
    currentPortfolio = data.portfolios.find((p) => p.id === editing);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <span className="nav-caption">WORKSPACE</span>
        <nav>
          {[
            [LayoutDashboard, "Overview"],
            [Layers, "Portfolios"],
            [ArrowRightLeft, "Transactions"],
            [ChartNoAxesCombined, "Analytics"],
            [FlaskConical, "What-if lab"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Layers;
            return (
              <button
                key={String(label)}
                className={tab === label ? "active" : ""}
                onClick={() => setTab(String(label))}
              >
                <I size={18} />
                {String(label)}
                {label === "What-if lab" && <span className="mini">LAB</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="free-card">
            <span>✳</span>
            <strong>Your data stays yours.</strong>
            <p>
              Private accounts.
              <br />
              No subscription required.
            </p>
            <small>Always free to run ↗</small>
          </div>
          <button onClick={() => setTab("Settings")}>
            <Settings size={18} /> Settings & data
          </button>
          <div className="profile">
            <span className="avatar">
              {demo ? "D" : user?.email[0].toUpperCase()}
            </span>
            <div>
              <strong>
                {demo ? "Demo workspace" : user?.email.split("@")[0]}
              </strong>
              <small>{demo ? "Explore freely" : "Personal account"}</small>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                try {
                  if (!demo) await api("/auth/logout", "POST");
                  setUser(null);
                  setDemo(false);
                  setData(empty);
                  setQuotes({});
                  setScope("ALL");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <span>
            Workspace <span className="slash">/</span> <strong>{tab}</strong>
          </span>
          <span>
            <i
              className={
                "status-dot " +
                (liveStatus === "connected" ? "live" : "neutral")
              }
            />
            {demo && !demoLive
              ? "Illustrative demo"
              : "Market data · check source status"}
            <label className="reporting-currency">
              Report in
              <select
                aria-label="Reporting currency"
                value={currency}
                disabled={busy}
                onChange={(e) =>
                  save({
                    ...data,
                    preferences: { ...preferences, currency: e.target.value },
                  })
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </span>
        </header>
        <main className="main-content">
          {demo && (
            <div className="demo-banner">
              <span>
                {demoLive
                  ? "◈ Sample transactions · provider market prices · changes are temporary."
                  : "◈ Demo transactions and prices are illustrative. Search uses real instrument metadata."}
              </span>
              <button
                onClick={() => {
                  setData(sample());
                  setScope("ALL");
                }}
              >
                Reset demo
              </button>
              <button
                onClick={() => {
                  setQuotes({});
                  setFx({});
                  setMarketError("");
                  setDemoLive((v) => !v);
                }}
              >
                {demoLive ? "Use illustrative prices" : "Use live market data"}
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">YOUR MONEY, IN PERSPECTIVE</span>
              <h1>
                {tab === "Overview"
                  ? "Portfolio overview"
                  : tab === "What-if lab"
                    ? "Explore the possibilities"
                    : tab}
              </h1>
              <p>
                {tab === "Overview"
                  ? "Your investments, connected."
                  : tab === "Analytics"
                    ? "Understand your returns, risks and exposures."
                    : tab === "What-if lab"
                      ? "Replay the past. Explore the future."
                      : "Your portfolio, organised."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                aria-label="Refresh market data"
                className="icon-button"
                disabled={loading}
                onClick={() => {
                  setError("");
                  setRefresh((n) => n + 1);
                }}
              >
                <RefreshCw size={17} />
              </button>
              <button className="secondary" onClick={exportData}>
                <Download size={16} /> Export
              </button>
              <button
                className="primary"
                onClick={() =>
                  open(data.portfolios.length ? "trade" : "portfolio")
                }
              >
                <Plus size={17} />
                {data.portfolios.length
                  ? "Add transaction"
                  : "Create portfolio"}
              </button>
            </div>
          </div>
          {error && (
            <div className="error dismiss" role="alert">
              {error}
              <button aria-label="Dismiss" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {marketError && <div className="inline-warning">{marketError}</div>}
          {fxError && (
            <div className="inline-warning">
              {fxError} Mixed-currency calculations require reference FX data.
            </div>
          )}
          {normalized.missing.length > 0 && (
            <div className="inline-warning">
              Waiting for exchange rates:{" "}
              {normalized.missing.slice(0, 3).join(", ")}. Values are blocked
              until currencies can be converted accurately.
            </div>
          )}
          <MarketDataStatus
            quotes={quotes}
            symbols={symbols.split(",").filter(Boolean)}
            liveStatus={liveStatus}
            illustrative={demo && !demoLive}
          />
          <div className="scope-bar">
            <div className="scope-tabs">
              <button
                className={scope === "ALL" ? "selected" : ""}
                onClick={() => setScope("ALL")}
              >
                <Layers size={14} />
                All portfolios
              </button>
              {data.portfolios.map((p) => (
                <button
                  key={p.id}
                  className={scope === p.id ? "selected" : ""}
                  onClick={() => setScope(p.id)}
                >
                  <i style={{ background: p.color }} />
                  {p.name}
                </button>
              ))}
              <button
                aria-label="Create portfolio"
                onClick={() => open("portfolio")}
              >
                <Plus size={16} />
              </button>
            </div>
            <small>
              {summary.holdings.length} assets · {trades.length} transactions
            </small>
          </div>
          {["Overview", "Analytics"].includes(tab) && (
            <Suspense
              fallback={
                <div className="empty">Loading portfolio analysis…</div>
              }
            >
              <PortfolioAnalytics
                history={history}
                summary={summary}
                quotes={normalized.quotes}
                nativeQuotes={quotes}
                trades={trades}
                currency={currency}
                benchmarks={preferences.benchmarks}
                busy={busy}
                onBenchmarks={(benchmarks) => {
                  save({
                    ...data,
                    preferences: { ...preferences, benchmarks },
                  });
                }}
                scope={scope}
                demo={demo}
                illustrative={demo && !demoLive}
                analytics={tab === "Analytics"}
                onSimulate={(symbol) => {
                  setInitialSource(symbol);
                  setTab("What-if lab");
                }}
              />
            </Suspense>
          )}
          {tab === "Transactions" && (
            <section className="card transactions">
              <div className="card-heading">
                <div>
                  <h2>Transaction ledger</h2>
                  <p>Every investment, in one place.</p>
                </div>
                <input
                  className="search"
                  aria-label="Search transactions"
                  placeholder="Search symbol…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Date",
                        "Asset",
                        "Portfolio",
                        "Type",
                        "Quantity",
                        "Unit price",
                        "Fee",
                        "Actions",
                      ].map((v) => (
                        <th key={v}>{v}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...trades]
                      .filter((t) =>
                        t.symbol.toLowerCase().includes(search.toLowerCase()),
                      )
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((t) => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>
                            <strong>{t.symbol}</strong>
                          </td>
                          <td>
                            {
                              data.portfolios.find(
                                (p) => p.id === t.portfolioId,
                              )?.name
                            }
                          </td>
                          <td>
                            <span
                              className={"trade-tag " + t.type.toLowerCase()}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td>{t.quantity}</td>
                          <td>{formatMoney(t.unitPrice, t.currency)}</td>
                          <td>{formatMoney(t.fee, t.currency)}</td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label="Edit transaction"
                              onClick={() => open("trade", t.id)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              disabled={busy}
                              className="icon-button"
                              aria-label="Delete transaction"
                              onClick={() => {
                                if (confirm("Delete this transaction?"))
                                  save({
                                    ...data,
                                    trades: data.trades.filter(
                                      (a) => a.id !== t.id,
                                    ),
                                  });
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!trades.length && (
                  <div className="empty">No transactions yet.</div>
                )}
              </div>
            </section>
          )}
          {tab === "Portfolios" && (
            <div className="portfolio-grid">
              {data.portfolios.map((p) => {
                const s = ledger(
                  normalized.trades.filter((t) => t.portfolioId === p.id),
                  normalized.quotes,
                );
                return (
                  <section className="card portfolio-card" key={p.id}>
                    <span
                      className="portfolio-symbol"
                      style={{ background: p.color }}
                    >
                      <Layers size={24} />
                    </span>
                    <h2>{p.name}</h2>
                    <p>
                      {s.holdings.length} assets · {currency}
                    </p>
                    <h3>
                      {s.complete && !normalized.missing.length
                        ? money(s.value)
                        : "Prices / FX unavailable"}
                    </h3>
                    <div className="portfolio-actions">
                      <button
                        className="secondary"
                        onClick={() => {
                          setScope(p.id);
                          setTab("Overview");
                        }}
                      >
                        Open portfolio ↗
                      </button>
                      <button
                        aria-label="Rename portfolio"
                        className="icon-button"
                        onClick={() => open("portfolio", p.id)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        disabled={busy}
                        aria-label="Delete portfolio"
                        className="icon-button"
                        onClick={async () => {
                          if (
                            confirm(
                              "Delete portfolio and all its transactions?",
                            )
                          )
                            if (
                              await save({
                                portfolios: data.portfolios.filter(
                                  (a) => a.id !== p.id,
                                ),
                                trades: data.trades.filter(
                                  (a) => a.portfolioId !== p.id,
                                ),
                              })
                            )
                              setScope("ALL");
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </section>
                );
              })}
              <button
                className="new-portfolio"
                onClick={() => open("portfolio")}
              >
                <Plus size={25} />
                Create a portfolio
              </button>
            </div>
          )}
          {tab === "What-if lab" && (
            <Suspense
              fallback={<div className="empty">Loading the what-if lab…</div>}
            >
              <ScenarioLab
                trades={normalized.missing.length ? [] : normalized.trades}
                quotes={normalized.quotes}
                portfolios={data.portfolios}
                currency={currency}
                scope={scope}
                initialSource={initialSource}
                demo={demo}
                onSymbolsChange={setExtraSymbols}
                saved={data.scenarios || []}
                onSave={(scenarios) => {
                  save({ ...data, scenarios });
                }}
                busy={busy}
              />
            </Suspense>
          )}
          {tab === "Settings" && (
            <section className="card settings">
              <h2>Your data, your workspace.</h2>
              <p>
                Account data is stored in the server’s SQLite database. Demo
                changes exist only in memory.
              </p>
              <button className="secondary" onClick={exportData}>
                <Download size={16} /> Download backup
              </button>
              <label>
                Restore a Folio Lab backup
                <input
                  type="file"
                  accept="application/json"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const next = JSON.parse(await file.text());
                      if (
                        !Array.isArray(next.portfolios) ||
                        !Array.isArray(next.trades)
                      )
                        throw Error("Invalid workspace backup.");
                      if (confirm("Replace this workspace with the backup?"))
                        if (await save(next)) setScope("ALL");
                    } catch (err) {
                      setError((err as Error).message);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="secondary"
                onClick={() => {
                  try {
                    const t = localStorage.getItem(
                        "foliolab_real_activities_v1",
                      ),
                      p = localStorage.getItem("foliolab_portfolios_v1");
                    if (!t || !p) throw Error("No legacy browser data found.");
                    if (confirm("Replace workspace with legacy browser data?"))
                      save({
                        trades: JSON.parse(t),
                        portfolios: JSON.parse(p),
                      });
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Import legacy browser data
              </button>
              <hr />
              <h2>Market data & methodology</h2>
              <p>
                Free best-effort quotes from Yahoo Finance’s unofficial
                endpoint. Refreshes every minute; exchange delays, provider
                limits and market closures apply. Availability is not
                guaranteed. Each holding shows its quote timestamp. Missing
                prices are never replaced with demo data. An optional Twelve
                Data free API key can be configured on the server; that provider
                uses a 15-minute refresh budget to conserve the free quota.
              </p>
              <p>
                EUR, USD, GBP, CHF and supported European local-currency
                transactions are supported. Listed assets may also be priced in
                British pence, converted to pounds before FX translation.
                Reporting currency is independent of the listing or transaction
                currency. Acquisition costs and cash flows use historical
                exchange rates; holdings use the latest daily reference FX.
                Dividends and automatic corporate actions are not included.
                Returns use end-of-day external cash flows. Local self-hosting
                is free; public hosting and redistribution are subject to
                provider terms.
              </p>
            </section>
          )}
          <footer>
            <span>Folio Lab · Free, private, self-hosted.</span>
            <span>
              {demo && !demoLive
                ? "Illustrative demo data"
                : `${Object.values(quotes)[0]?.source || "Market data"} · FX ${fxAsOf || "loading"} (daily reference)`}
            </span>
          </footer>
        </main>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => !busy && setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-heading">
              <h2 id="dialog-title">
                {editing ? "Edit" : "New"}{" "}
                {modal === "trade" ? "transaction" : "portfolio"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <form
              ref={tradeFormRef}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (modal === "portfolio") {
                  const p = {
                    id: editing || crypto.randomUUID(),
                    name: String(f.get("name")).trim(),
                    color: colors[data.portfolios.length % 6],
                    currency,
                    createdAt: day(),
                  };
                  save({
                    ...data,
                    portfolios: editing
                      ? data.portfolios.map((a) =>
                          a.id === editing ? { ...a, name: p.name } : a,
                        )
                      : [...data.portfolios, p],
                  });
                } else {
                  const t: PortfolioActivity = {
                    id: editing || crypto.randomUUID(),
                    symbol: String(f.get("symbol")).trim().toUpperCase(),
                    name: String(f.get("name")),
                    portfolioId: String(f.get("portfolioId")),
                    type: f.get("type") as "BUY" | "SELL",
                    quantity: Number(f.get("quantity")),
                    unitPrice: Number(f.get("unitPrice")),
                    fee: Number(f.get("fee")),
                    date: String(f.get("date")),
                    currency: String(f.get("currency")),
                  };
                  save({
                    ...data,
                    trades: editing
                      ? data.trades.map((a) => (a.id === editing ? t : a))
                      : [...data.trades, t],
                  });
                }
              }}
            >
              {modal === "portfolio" ? (
                <label>
                  Portfolio name
                  <input
                    autoFocus
                    required
                    name="name"
                    maxLength={100}
                    defaultValue={currentPortfolio?.name}
                  />
                </label>
              ) : (
                <>
                  <AssetSearch
                    demo={demo}
                    onSelect={async (a) => {
                      const form = tradeFormRef.current;
                      if (!form) return;
                      for (const [name, value] of Object.entries({
                        symbol: a.symbol,
                        name: a.name,
                        currency: a.currency,
                      })) {
                        const field = form.elements.namedItem(name) as
                          HTMLInputElement | HTMLSelectElement | null;
                        if (field) field.value = value;
                      }
                      try {
                        const quote =
                          quotes[a.symbol] ||
                          (demo
                            ? sampleQuotes()[a.symbol]
                            : await api(
                                "/market/chart/" + encodeURIComponent(a.symbol),
                              ));
                        const symbolField = form.elements.namedItem(
                          "symbol",
                        ) as HTMLInputElement;
                        if (
                          !quote ||
                          !form.isConnected ||
                          symbolField.value !== a.symbol
                        )
                          return;
                        const currencyField = form.elements.namedItem(
                          "currency",
                        ) as HTMLSelectElement;
                        if (currencyField.value === a.currency)
                          currencyField.value =
                            quote.currency === "GBp" || quote.currency === "GBX"
                              ? "GBP"
                              : quote.currency;
                      } catch {
                        setError(
                          "Could not verify listing currency. Confirm the transaction currency from your broker before saving.",
                        );
                      }
                    }}
                  />
                  <label>
                    Transaction currency
                    <select
                      name="currency"
                      aria-label="Transaction currency"
                      defaultValue={currentTrade?.currency || currency}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Portfolio
                    <select
                      name="portfolioId"
                      required
                      defaultValue={
                        currentTrade?.portfolioId ||
                        (scope === "ALL" ? data.portfolios[0]?.id : scope)
                      }
                    >
                      {data.portfolios.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-grid">
                    <label>
                      Symbol
                      <input
                        autoFocus
                        name="symbol"
                        required
                        maxLength={24}
                        defaultValue={currentTrade?.symbol}
                        placeholder="VWCE.DE, ASML.AS, AAPL…"
                      />
                    </label>
                    <label>
                      Type
                      <select
                        name="type"
                        defaultValue={currentTrade?.type || "BUY"}
                      >
                        <option>BUY</option>
                        <option>SELL</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Asset name
                    <input
                      required
                      name="name"
                      defaultValue={currentTrade?.name}
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Quantity
                      <input
                        required
                        name="quantity"
                        type="number"
                        min="0.00000001"
                        step="any"
                        defaultValue={currentTrade?.quantity}
                      />
                    </label>
                    <label>
                      Unit price (transaction currency)
                      <input
                        required
                        name="unitPrice"
                        type="number"
                        min="0.00000001"
                        step="any"
                        defaultValue={currentTrade?.unitPrice}
                      />
                    </label>
                    <label>
                      Fee (transaction currency)
                      <input
                        required
                        name="fee"
                        type="number"
                        min="0"
                        step="any"
                        defaultValue={currentTrade?.fee || 0}
                      />
                    </label>
                    <label>
                      Date
                      <input
                        required
                        name="date"
                        type="date"
                        max={day()}
                        defaultValue={currentTrade?.date || day()}
                      />
                    </label>
                  </div>
                </>
              )}
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <button className="primary full" disabled={busy}>
                {busy ? "Saving…" : "Save " + modal}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <ChartNoAxesCombined size={22} />
      </span>
      folio<span className="brand-light">lab</span>
      <b>•</b>
    </div>
  );
}
