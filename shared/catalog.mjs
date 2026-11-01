export function parseDelimited(text, delimiter = ";") {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
const validSymbol = (s) => /^[A-Z0-9.^=-]{1,24}$/.test(s);
export function parseXetra(text) {
  const rows = parseDelimited(text),
    start = rows.findIndex((r) => r.includes("Mnemonic") && r.includes("ISIN"));
  if (start < 0) throw Error("Xetra directory format changed.");
  const header = rows[start],
    at = (r, key) => r[header.indexOf(key)]?.trim() || "";
  const quotes = rows
    .slice(start + 1)
    .filter((r) => at(r, "Instrument Status") === "Active" && at(r, "Mnemonic"))
    .map((r) => ({
      symbol: at(r, "Mnemonic") + ".DE",
      ticker: at(r, "Mnemonic"),
      name: at(r, "Instrument"),
      isin: at(r, "ISIN"),
      wkn: at(r, "WKN").replace(/^0+(?=.{6}$)/, ""),
      currency: at(r, "Currency") || at(r, "Settlement Currency"),
      exchange: "Xetra",
      mic: "XETR",
      type:
        at(r, "Instrument Type") === "ETF"
          ? "ETF"
          : at(r, "Instrument Type") === "ETC"
            ? "ETC"
            : at(r, "Instrument Type") === "CS"
              ? "Stock"
              : at(r, "Instrument Type") || "Other",
      directory: "xetra",
      source: "Deutsche Börse Xetra",
      providerSymbolVerified: false,
    }))
    .filter((a) => validSymbol(a.symbol));
  if (!quotes.length) throw Error("Xetra directory is empty.");
  return {
    quotes,
    sourceDate:
      rows.find((r) => r[0]?.includes("Date Last Update"))?.[1] || null,
  };
}
export function parseNasdaq(text) {
  const rows = parseDelimited(text, "|"),
    header = rows[0],
    at = (r, key) => r[header.indexOf(key)]?.trim() || "";
  if (!header.includes("Security Name"))
    throw Error("US directory format changed.");
  const venues = {
    Q: "Nasdaq",
    N: "NYSE",
    P: "NYSE Arca",
    A: "NYSE American",
    Z: "Cboe BZX",
    V: "IEX",
    B: "Nasdaq BX",
  };
  const quotes = rows
    .slice(1)
    .filter(
      (r) => at(r, "Test Issue") === "N" && at(r, "Nasdaq Traded") === "Y",
    )
    .map((r) => {
      const ticker = at(r, "Symbol"),
        name = at(r, "Security Name");
      return {
        symbol: ticker.replaceAll(".", "-"),
        ticker,
        name,
        isin: "",
        currency: "USD",
        exchange:
          venues[at(r, "Listing Exchange")] || at(r, "Listing Exchange"),
        type:
          at(r, "ETF") === "Y"
            ? "ETF"
            : /warrant|unit|preferred|note|right/i.test(name)
              ? "Other"
              : "Stock",
        directory: "us",
        source: "Nasdaq Trader",
        providerSymbolVerified: false,
      };
    })
    .filter((a) => validSymbol(a.symbol));
  if (!quotes.length) throw Error("US directory is empty.");
  return {
    quotes,
    sourceDate:
      rows.find((r) => r[0]?.startsWith("File Creation Time"))?.[0] || null,
  };
}
export function parseCoinbase(products) {
  if (!Array.isArray(products)) throw Error("Crypto directory format changed.");
  return {
    quotes: products
      .filter(
        (p) =>
          p.status === "online" &&
          !p.trading_disabled &&
          ["EUR", "USD", "GBP"].includes(p.quote_currency) &&
          validSymbol(p.id),
      )
      .map((p) => ({
        symbol: p.id,
        ticker: p.base_currency,
        name: `${p.base_currency} / ${p.quote_currency}`,
        currency: p.quote_currency,
        isin: "",
        exchange: "Coinbase Exchange",
        type: "Crypto",
        directory: "crypto",
        source: "Coinbase Exchange",
        providerSymbolVerified: true,
      })),
    sourceDate: null,
  };
}
export function filterCatalog(
  quotes,
  {
    q = "",
    type = "",
    exchange = "",
    currency = "",
    country = "",
    offset = 0,
    limit = 40,
  } = {},
) {
  const term = q.toLowerCase().trim(),
    tokens = term.split(/\s+/).filter(Boolean);
  let filtered = quotes.filter(
    (a) =>
      (!type || a.type === type) &&
      (!exchange || a.exchange === exchange) &&
      (!currency || a.currency === currency) &&
      (!country || a.country === country) &&
      tokens.every((t) =>
        `${a.symbol} ${a.ticker || ""} ${a.name} ${a.isin || ""} ${a.wkn || ""}`
          .toLowerCase()
          .includes(t),
      ),
  );
  if (term)
    filtered.sort(
      (a, b) => score(b, term) - score(a, term) || a.name.localeCompare(b.name),
    );
  const start = Math.max(0, Number(offset) || 0),
    size = Math.min(100, Math.max(1, Number(limit) || 40));
  return {
    quotes: filtered.slice(start, start + size),
    total: filtered.length,
    offset: start,
    limit: size,
    hasMore: start + size < filtered.length,
  };
}
function score(a, q) {
  return (
    (a.symbol.toLowerCase() === q ? 100 : 0) +
    (a.ticker?.toLowerCase() === q ? 90 : 0) +
    (a.isin?.toLowerCase() === q ? 100 : 0) +
    (a.name.toLowerCase().startsWith(q) ? 20 : 0)
  );
}
