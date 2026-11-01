import { CURRENCIES } from "../shared/markets.mjs";
// Optional official provider. Conservative 15-minute quotes and daily history
// keep eight assets within the free 800-credit daily plan in typical use.
const cache = new Map();
let minute = 0,
  minuteCount = 0,
  day = "",
  dailyCount = 0;
async function call(endpoint, symbol) {
  const now = Date.now(),
    m = Math.floor(now / 60000),
    d = new Date(now).toISOString().slice(0, 10);
  if (m !== minute) {
    minute = m;
    minuteCount = 0;
  }
  if (d !== day) {
    day = d;
    dailyCount = 0;
  }
  if (minuteCount >= 8 || dailyCount >= 790)
    throw Error("Free market-data quota reached. Retry later.");
  minuteCount++;
  dailyCount++;
  const url = new URL("https://api.twelvedata.com/" + endpoint);
  url.searchParams.set(
    "symbol",
    symbol.endsWith("-USD") ? symbol.replace("-USD", "/USD") : symbol,
  );
  url.searchParams.set("apikey", process.env.TWELVE_DATA_API_KEY);
  if (endpoint === "time_series") {
    url.searchParams.set("interval", "1day");
    url.searchParams.set("outputsize", "5000");
    url.searchParams.set("order", "asc");
    url.searchParams.set("adjust", "none");
  }
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) }),
    data = await r.json();
  if (!r.ok || data.status === "error")
    throw Error("Twelve Data: " + (data.message || "Provider unavailable"));
  return data;
}
export async function twelveQuote(symbol) {
  let saved = cache.get(symbol) || {};
  if (!saved.history || saved.historyAt < Date.now() - 86400000) {
    const h = await call("time_series", symbol);
    if (!CURRENCIES.includes(h.meta.currency))
      throw Error("Choose a listing supported by the reference FX feed.");
    saved = {
      ...saved,
      historyAt: Date.now(),
      history: h.values.map((p) => ({
        date: p.datetime.slice(0, 10),
        timestamp: Date.parse(p.datetime) / 1000,
        price: Number(p.close),
      })),
    };
    cache.set(symbol, saved);
  }
  if (saved.quote && saved.quoteAt > Date.now() - 15 * 60000)
    return saved.quote;
  const q = await call("quote", symbol);
  if (!CURRENCIES.includes(q.currency) || !Number.isFinite(Number(q.close)))
    throw Error("Invalid quote or unsupported currency.");
  const quote = {
    symbol,
    shortName: q.name || symbol,
    currency: q.currency,
    currentPrice: Number(q.close),
    history: saved.history,
    asOf: new Date(Number(q.timestamp) * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    source: "Twelve Data (free tier; 15-minute refresh budget)",
    delay: null,
  };
  cache.set(symbol, { ...saved, quote, quoteAt: Date.now() });
  return quote;
}
