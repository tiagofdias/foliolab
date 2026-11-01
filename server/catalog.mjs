import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join, dirname } from "node:path";
import { dataDirectory } from "./paths.mjs";
import readXlsxFile from "read-excel-file/node";
import {
  parseLondon,
  parseEuronext,
  parseSwiss,
  parseNordic,
  parseWarsaw,
} from "../shared/europeanCatalog.mjs";
import { marketForSymbol, europeanCoverage } from "../shared/markets.mjs";
const CATALOG_VERSION = 6;
import {
  parseXetra,
  parseNasdaq,
  parseCoinbase,
  filterCatalog,
} from "../shared/catalog.mjs";
const XETRA_PAGE =
  "https://www.cashmarket.deutsche-boerse.com/cash-en/trading/Tradable-Instruments-Xetra/xetra";
const sources = [
  {
    id: "warsaw",
    label: "Warsaw ETFs",
    url: "https://www.gpw.pl/ajaxindex.php",
  },
  { id: "xetra", label: "Xetra", url: XETRA_PAGE },
  {
    id: "london",
    label: "London ETFs & ETPs",
    url: "https://www.londonstockexchange.com/content/dam/lse/en_us/documents/reports/etf-and-etp-categorisation.xlsx",
  },
  {
    id: "euronext",
    label: "Euronext ETFs & ETPs",
    url: "https://live.euronext.com/en/products/etfs/list",
  },
  {
    id: "six",
    label: "SIX ETFs",
    url: "https://www.six-group.com/fqs/ref.json?select=FundLongName,ValorSymbol,FundReutersTicker,ISIN,TradingBaseCurrency,ValorId&where=ProductLine=ET*PortalSegment=FU&orderby=FundLongName&page=1&pagesize=99999",
  },
  ...[
    ["STO", "Stockholm"],
    ["HEL", "Helsinki"],
    ["CPH", "Copenhagen"],
    ["NOR", "Norway"],
    ["ICE", "Iceland"],
  ].map(([market, label]) => ({
    id: "nordic-" + market,
    market,
    label: "Nasdaq Nordic " + label + " ETFs",
    url:
      "https://api.nasdaq.com/api/nordic/screener/etp?category=ETF&tableonly=false&market=" +
      market,
  })),
  {
    id: "us",
    label: "US listings",
    url: "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt",
  },
  {
    id: "crypto",
    label: "Coinbase fiat pairs",
    url: "https://api.exchange.coinbase.com/products",
  },
];
let memory = null,
  pending = null;
const cachePath =
  process.env.CATALOG_PATH ||
  join(dataDirectory(), "instrument-directory.json");
async function fetchText(url) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(18000),
    headers: { "User-Agent": "FolioLab/1.0" },
  });
  if (!r.ok) throw Error(`Directory provider returned ${r.status}`);
  return r.text();
}
async function loadSource(source) {
  if (source.id === "warsaw") {
    const response = await fetch(source.url, {
      method: "POST",
      body: new URLSearchParams({
        action: "GPWQuotationsETF",
        start: "ajaxList",
        page: "etfy",
      }),
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok)
      throw Error(`Warsaw directory returned ${response.status}`);
    return {
      ...source,
      ...parseWarsaw(await response.text()),
      fetchedAt: new Date().toISOString(),
      error: null,
      stale: false,
    };
  }
  if (source.id === "london") {
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok)
      throw Error(`London directory returned ${response.status}`);
    const sheets = await readXlsxFile(
      Buffer.from(await response.arrayBuffer()),
    );
    const parsed = parseLondon(sheets[0]?.data || []);
    return {
      ...source,
      ...parsed,
      fetchedAt: new Date().toISOString(),
      error: null,
      stale: false,
    };
  }
  let text = await fetchText(source.url),
    parsed;
  if (source.id === "xetra") {
    const path = text.match(
      /href="([^"]*t7-xetr-allTradableInstruments\.csv)"/i,
    )?.[1];
    if (!path) throw Error("Xetra download link unavailable.");
    const download = new URL(path, XETRA_PAGE);
    if (download.hostname !== "www.cashmarket.deutsche-boerse.com")
      throw Error("Unexpected directory host.");
    text = await fetchText(download.href);
    parsed = parseXetra(text);
  } else if (source.id === "euronext") {
    const settings = JSON.parse(
      text.match(
        /<script type="application\/json" data-drupal-selector="drupal-settings-json">(.*?)<\/script>/s,
      )?.[1] || "{}",
    );
    if (!settings.jsongateway_download)
      throw Error("Euronext directory download is unavailable.");
    const download = new URL(settings.jsongateway_download, source.url);
    if (download.hostname !== "live.euronext.com")
      throw Error("Unexpected Euronext directory host.");
    parsed = parseEuronext(await fetchText(download.href));
  } else if (source.id === "six") parsed = parseSwiss(JSON.parse(text));
  else if (source.id.startsWith("nordic-"))
    parsed = parseNordic(JSON.parse(text), source.market);
  else if (source.id === "us") parsed = parseNasdaq(text);
  else parsed = parseCoinbase(JSON.parse(text));
  return {
    ...source,
    ...parsed,
    fetchedAt: new Date().toISOString(),
    error: null,
    stale: false,
  };
}
export async function getCatalog() {
  if (!memory) {
    try {
      const saved = JSON.parse(await readFile(cachePath, "utf8"));
      if (Array.isArray(saved.sources)) memory = saved;
    } catch {
      /* first use */
    }
  }
  if (
    memory &&
    memory.version === CATALOG_VERSION &&
    Date.now() - Date.parse(memory.fetchedAt) <
      (memory.sources.some((s) => s.error) ? 300000 : 24 * 3600000)
  )
    return memory;
  if (pending) return pending;
  pending = (async () => {
    const settled = await Promise.allSettled(sources.map(loadSource));
    const loaded = settled.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      const previous = memory?.sources.find((s) => s.id === sources[i].id);
      return {
        ...sources[i],
        ...(previous || {}),
        error: r.reason.message,
        stale: !!previous,
        quotes: previous?.quotes || [],
      };
    });
    // Keep separate venues; provider-symbol collisions have one canonical listing.
    const candidates = loaded.flatMap((s) => s.quotes);
    const identities = new Map();
    for (const q of candidates) {
      const id = `${q.isin || ""}:${q.currency === "GBp" ? "GBX" : q.currency}`;
      const set = identities.get(q.symbol) || new Set();
      set.add(id);
      identities.set(q.symbol, set);
    }
    const conflicts = [...identities]
      .filter(([, ids]) => ids.size > 1)
      .map(([symbol]) => symbol);
    const quotes = [
      ...new Map(
        candidates
          .filter((a) => !conflicts.includes(a.symbol))
          .map((a) => [a.symbol, a]),
      ).values(),
    ]
      .map((a) => ({
        ...a,
        country:
          a.country ||
          marketForSymbol(a.symbol)?.country ||
          (a.directory === "us" ? "US" : ""),
        sourceDate:
          loaded.find((s) => s.id === a.directory)?.sourceDate || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const snapshot = {
      version: CATALOG_VERSION,
      fetchedAt: new Date().toISOString(),
      sources: loaded,
      conflicts,
      quotes,
    };
    if (!quotes.length)
      throw Error(
        "Instrument directories are unavailable. Global lookup is still available.",
      );
    memory = snapshot;
    if (!process.env.CATALOG_NO_DISK) {
      await mkdir(dirname(cachePath), { recursive: true });
      try {
        await writeFile(cachePath + ".tmp", JSON.stringify(snapshot));
        await rename(cachePath + ".tmp", cachePath);
      } catch {
        /* memory cache remains usable */
      }
    }
    return snapshot;
  })();
  try {
    return await pending;
  } finally {
    pending = null;
  }
}
export async function catalogPage(params) {
  const snapshot = await getCatalog();
  const page = filterCatalog(snapshot.quotes, params);
  return {
    ...page,
    directoryTotal: snapshot.quotes.length,
    excludedAmbiguousSymbols: snapshot.conflicts?.length || 0,
    fetchedAt: snapshot.fetchedAt,
    sources: snapshot.sources.map(({ quotes, ...s }) => ({
      ...s,
      count: quotes.length,
    })),
    filters: {
      countries: [
        ...new Set(snapshot.quotes.map((a) => a.country).filter(Boolean)),
      ].sort(),
      types: [...new Set(snapshot.quotes.map((a) => a.type))].sort(),
      exchanges: [...new Set(snapshot.quotes.map((a) => a.exchange))].sort(),
      currencies: [...new Set(snapshot.quotes.map((a) => a.currency))].sort(),
    },
  };
}
export async function listingForSymbol(symbol) {
  const c = await getCatalog();
  if (c.conflicts?.includes(symbol))
    throw Error(
      "This provider symbol maps to multiple directory currency lines or instruments. Use an exact alternative listing.",
    );
  return c.quotes.find((q) => q.symbol === symbol) || null;
}
export async function marketCoverage() {
  const snapshot = await getCatalog();
  return {
    fetchedAt: snapshot.fetchedAt,
    markets: europeanCoverage(snapshot.quotes),
    note: "Directory counts are not verified quote coverage. A zero count does not mean the country has no ETFs. Published delays are not a guaranteed maximum quote age.",
  };
}
const lookupCache = new Map();
export async function searchAssets(query) {
  const key = query.trim().toLowerCase();
  const hit = lookupCache.get(key);
  if (hit && hit.until > Date.now()) return hit.data;
  let catalog = [],
    catalogError = "";
  try {
    const c = await getCatalog();
    catalog = filterCatalog(c.quotes, { q: query, limit: 100 }).quotes;
  } catch (e) {
    catalogError = e.message;
  }
  let remote = [],
    lookupError = "";
  try {
    const raw = JSON.parse(
      await fetchText(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=50&newsCount=0`,
      ),
    );
    remote = (raw.quotes || [])
      .filter((q) => q.symbol && /^[A-Z0-9.^=-]{1,24}$/.test(q.symbol))
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange,
        type:
          {
            EQUITY: "Stock",
            ETF: "ETF",
            CRYPTOCURRENCY: "Crypto",
            INDEX: "Index",
            MUTUALFUND: "Fund",
          }[q.quoteType] ||
          q.quoteType ||
          "Other",
        currency: q.currency || "",
        source: "Yahoo Finance search",
        providerSymbolVerified: true,
        country: marketForSymbol(q.symbol)?.country || "",
        mic: marketForSymbol(q.symbol)?.mic || "",
      }));
  } catch (e) {
    lookupError = e.message;
  }
  const quotes = [
    ...new Map([...remote, ...catalog].map((a) => [a.symbol, a])).values(),
  ];
  if (!quotes.length && catalogError && lookupError)
    throw Error(
      "Search sources are unavailable. Retry or use an exact listing symbol.",
    );
  const data = {
    quotes,
    total: quotes.length,
    lookupError,
    catalogError,
    coverage:
      "Directory matches plus provider-wide lookup; provider coverage is not the entire global securities universe.",
  };
  lookupCache.set(key, { data, until: Date.now() + 300000 });
  if (lookupCache.size > 300)
    lookupCache.delete(lookupCache.keys().next().value);
  return data;
}
