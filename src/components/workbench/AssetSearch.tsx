import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Search,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import type { Asset } from "../../data/catalog";
import { EUROPEAN_MARKETS } from "../../../shared/markets.mjs";
interface DirectoryPage {
  quotes: Asset[];
  total: number;
  directoryTotal?: number;
  offset?: number;
  limit?: number;
  hasMore?: boolean;
  fetchedAt?: string;
  sources?: {
    label: string;
    count: number;
    error: string | null;
    stale: boolean;
    sourceDate?: string;
  }[];
  filters?: {
    types: string[];
    exchanges: string[];
    currencies: string[];
    countries?: string[];
  };
  lookupError?: string;
  catalogError?: string;
}
export function AssetSearch({
  onSelect,
  demo = false,
  placeholder = "Search by name, ticker, ISIN or WKN…",
}: {
  onSelect: (asset: Asset) => void;
  demo?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [mode, setMode] = useState<"search" | "browse" | "coverage">("search"),
    [page, setPage] = useState<DirectoryPage | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [offset, setOffset] = useState(0),
    [type, setType] = useState(""),
    [exchange, setExchange] = useState(""),
    [currency, setCurrency] = useState(""),
    [country, setCountry] = useState("");
  const [coverage, setCoverage] = useState<{
    markets: {
      country: string;
      countryName: string;
      exchange: string;
      listingCount: number;
      directoryStatus: string;
      delayMinutes: number | null;
      suffix?: string;
    }[];
    note: string;
  } | null>(null);
  useEffect(() => {
    if (!open || mode !== "coverage") return;
    const abort = new AbortController();
    setPage(null);
    setError("");
    setLoading(true);
    fetch("/api/market/coverage", { signal: abort.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error || "Coverage unavailable");
        setCoverage(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [open, mode]);
  const root = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    if (!open) return;
    const align = () => {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(620, innerWidth - 40),
        below = innerHeight - rect.bottom - 16,
        above = rect.top - 16,
        placeBelow = below >= 340 || below >= above,
        height = Math.max(160, Math.min(650, placeBelow ? below : above));
      const style = {
        position: "fixed",
        left: Math.max(16, Math.min(rect.left, innerWidth - width - 16)),
        top: placeBelow ? rect.bottom + 6 : "auto",
        bottom: placeBelow ? "auto" : Math.max(12, innerHeight - rect.top + 6),
        right: "auto",
        width,
        maxHeight: height,
        "--directory-rows-height": Math.max(90, height - 310) + "px",
      } as CSSProperties;
      setPlacement(style);
    };
    align();
    window.addEventListener("resize", align);
    window.addEventListener("scroll", align, true);
    return () => {
      window.removeEventListener("resize", align);
      window.removeEventListener("scroll", align, true);
    };
  }, [open, mode]);
  const limit = 30;
  useEffect(() => {
    if (!open) return;
    const listener = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", listener);
    return () => document.removeEventListener("pointerdown", listener);
  }, [open]);
  useEffect(() => {
    if (!open || mode === "coverage") return;
    if (mode === "search" && query.trim().length < 2) {
      setPage(null);
      setLoading(false);
      setError("");
      return;
    }
    let active = true;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(
      async () => {
        try {
          const params = new URLSearchParams({
            q: query.trim(),
            type,
            exchange,
            currency,
            country,
            offset: String(offset),
            limit: String(limit),
          });
          const url =
            mode === "browse"
              ? "/api/market/catalog?" + params
              : "/api/market/search?q=" + encodeURIComponent(query.trim());
          const response = await fetch(url, { signal: abort.signal });
          const data = await response.json();
          if (!response.ok) throw Error(data.error || "Search unavailable");
          if (active) {
            setPage(data);
            setError(
              [data.lookupError, data.catalogError].filter(Boolean).join(" · "),
            );
          }
        } catch (e) {
          if (active && (e as Error).name !== "AbortError") {
            setError((e as Error).message);
            setPage(null);
          }
        } finally {
          if (active) setLoading(false);
        }
      },
      mode === "browse" ? 0 : 350,
    );
    return () => {
      active = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [open, mode, query, type, exchange, currency, country, offset]);
  function select(asset: Asset) {
    onSelect(asset);
    setOpen(false);
    setQuery("");
    setOffset(0);
  }
  const rows =
      mode === "browse"
        ? page?.quotes || []
        : (page?.quotes || []).slice(offset, offset + limit),
    total = page?.total || 0;
  return (
    <div
      className="asset-search"
      ref={root}
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <div className="search-field">
        <Search size={15} />
        <input
          aria-label="Search assets"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOffset(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {loading ? (
          <LoaderCircle className="spinning" size={14} />
        ) : (
          open && (
            <button
              type="button"
              aria-label="Close asset search"
              onClick={() => setOpen(false)}
            >
              <X size={14} />
            </button>
          )
        )}
      </div>
      {open && (
        <div className="search-results full-directory" style={placement}>
          <div className="directory-tabs">
            <button
              type="button"
              className={mode === "coverage" ? "selected" : ""}
              onClick={() => setMode("coverage")}
            >
              European coverage
            </button>
            <button
              type="button"
              className={mode === "search" ? "selected" : ""}
              onClick={() => {
                setMode("search");
                setOffset(0);
              }}
            >
              Global lookup
            </button>
            <button
              type="button"
              className={mode === "browse" ? "selected" : ""}
              onClick={() => {
                setMode("browse");
                setOffset(0);
              }}
            >
              Browse directories
            </button>
          </div>
          {mode === "coverage" && coverage && (
            <div className="directory-coverage">
              <p>
                Connected directories and remaining gaps. Counts describe
                indexed ETFs, not tested price coverage.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Country / venue</th>
                      <th>ETFs</th>
                      <th>Published delay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.markets.map((m) => (
                      <tr key={m.country + m.exchange}>
                        <td>
                          {m.countryName}
                          <small>
                            {m.exchange} {m.suffix}
                          </small>
                        </td>
                        <td>
                          {m.listingCount.toLocaleString()}
                          <small>{m.directoryStatus}</small>
                        </td>
                        <td>
                          {m.delayMinutes === null
                            ? "Unverified"
                            : m.delayMinutes === 0
                              ? "Source lists real-time"
                              : `${m.delayMinutes} min`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <small>{coverage.note}</small>
            </div>
          )}
          {mode === "search" && query.trim().length < 2 && (
            <div className="directory-intro">
              <strong>Search beyond the presets.</strong>
              <p>
                Find an exact listing by ticker, name, ISIN or WKN. Try VVSM,
                IE00BMC38736 or a fund name.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode("browse");
                  setOffset(0);
                }}
              >
                Browse the full available directories <ChevronRight size={13} />
              </button>
            </div>
          )}
          {mode === "browse" && (
            <div className="directory-filters">
              <label>
                Country
                <select
                  aria-label="Asset country filter"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setExchange("");
                    setOffset(0);
                  }}
                >
                  <option value="">All countries</option>
                  {(page?.filters?.countries || []).map((c) => (
                    <option key={c} value={c}>
                      {EUROPEAN_MARKETS.find((m) => m.country === c)
                        ?.countryName || (c === "US" ? "United States" : c)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Type
                <select
                  aria-label="Asset type filter"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="">All types</option>
                  {(page?.filters?.types || ["Stock", "ETF", "Crypto"]).map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Venue
                <select
                  aria-label="Asset venue filter"
                  value={exchange}
                  onChange={(e) => {
                    setExchange(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="">All venues</option>
                  {(
                    page?.filters?.exchanges || [
                      "Xetra",
                      "Nasdaq",
                      "NYSE",
                      "Coinbase Exchange",
                    ]
                  ).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Currency
                <select
                  aria-label="Asset currency filter"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="">All currencies</option>
                  {(page?.filters?.currencies || ["EUR", "USD", "GBP"]).map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
          )}
          {loading && (
            <p className="directory-loading">
              <LoaderCircle size={14} className="spinning" />
              Loading{" "}
              {mode === "browse"
                ? "instrument directories"
                : mode === "coverage"
                  ? "exchange coverage"
                  : "matching listings"}
              …
            </p>
          )}
          {error && (
            <p role="status" className="directory-error">
              {error}
            </p>
          )}
          {page && (
            <div className="directory-count">
              <strong>
                {total.toLocaleString()}{" "}
                {mode === "browse" ? "directory listings" : "lookup matches"}
              </strong>
              {mode === "browse" && (
                <span>of {page.directoryTotal?.toLocaleString()} indexed</span>
              )}
            </div>
          )}
          <div className="directory-rows">
            {rows.map((a) => (
              <button type="button" key={a.symbol} onClick={() => select(a)}>
                <span>
                  <strong>
                    {a.symbol} <em>{a.type}</em>
                  </strong>
                  <small>{a.name}</small>
                  {a.isin && (
                    <small className="instrument-id">
                      ISIN {a.isin}
                      {a.wkn ? " · WKN " + a.wkn : ""}
                    </small>
                  )}
                </span>
                <span className="asset-exchange">
                  {a.exchange || "Venue unverified"}
                  <small>{a.currency || "Currency to verify"}</small>
                  <Plus size={13} />
                </span>
              </button>
            ))}
          </div>
          {page && rows.length === 0 && !loading && (
            <p className="directory-loading">
              No listings match these filters. Try Global lookup for other
              venues.
            </p>
          )}
          {total > limit && (
            <div className="directory-pagination">
              <button
                type="button"
                aria-label="Previous asset page"
                disabled={loading || offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                <ChevronLeft size={14} />
              </button>
              <span>
                {offset + 1}–{Math.min(offset + limit, total)} of{" "}
                {total.toLocaleString()}
              </span>
              <button
                type="button"
                aria-label="Next asset page"
                disabled={loading || offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
          {page?.sources && (
            <div className="directory-sources">
              {page.sources.map((s) => (
                <span key={s.label}>
                  {s.label}: {s.count.toLocaleString()}
                  {s.sourceDate ? " · reference " + s.sourceDate : ""}
                  {s.error
                    ? " · " +
                      (s.stale ? "cached; refresh failed" : "unavailable")
                    : ""}
                </span>
              ))}
              <small>
                Reference directory fetched{" "}
                {page.fetchedAt
                  ? new Date(page.fetchedAt).toLocaleString("en-GB")
                  : "—"}
                . Listing metadata does not guarantee quote coverage.
              </small>
            </div>
          )}
          <small className="directory-disclaimer">
            {demo
              ? "Demo balances remain illustrative. This search uses real instrument metadata. "
              : ""}
            Global lookup extends beyond the downloaded directories. Exact venue
            and quote currency are verified when prices load. European sources
            may be 15, 20 or 30 minutes delayed; see European coverage.
          </small>
        </div>
      )}
    </div>
  );
}
