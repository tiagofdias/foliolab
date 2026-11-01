import { CURRENCIES } from "../shared/markets.mjs";
const quotes = CURRENCIES.filter((c) => c !== "EUR");
let cache = null,
  pending = null;
export async function exchangeRates(from) {
  if (cache && cache.from <= from && cache.expires > Date.now())
    return cache.data;
  if (pending) {
    await pending;
    if (cache && cache.from <= from) return cache.data;
  }
  pending = (async () => {
    const start = new Date(
      Math.max(Date.parse("1999-01-04"), Date.parse(from) - 10 * 86400000),
    )
      .toISOString()
      .slice(0, 10);
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rates?base=EUR&quotes=${quotes.join(",")}&from=${start}`,
      { signal: AbortSignal.timeout(25000) },
    );
    if (!response.ok)
      throw Error(`Exchange rates unavailable (${response.status}).`);
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length)
      throw Error("Exchange-rate provider returned no rates.");
    const rates = Object.fromEntries(quotes.map((c) => [c, []]));
    for (const row of rows) {
      if (rates[row.quote] && Number.isFinite(row.rate) && row.rate > 0)
        rates[row.quote].push({ date: row.date, rate: row.rate });
    }
    for (const points of Object.values(rates))
      points.sort((a, b) => a.date.localeCompare(b.date));
    const data = {
      rates,
      asOf: rates.USD.at(-1)?.date,
      source: "Frankfurter · daily reference FX",
    };
    cache = { from, expires: Date.now() + 6 * 3600000, data };
    return data;
  })();
  try {
    return await pending;
  } finally {
    pending = null;
  }
}
