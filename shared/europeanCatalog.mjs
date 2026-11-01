import { parseDelimited } from "./catalog.mjs";
const clean = (v) => String(v ?? "").trim();
const valid = (s) => /^[A-Z0-9.^=-]{1,24}$/.test(s);
export function parseWarsaw(html) {
  const quotes = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap(
    ([, row]) => {
      const cell = (id) =>
        row
          .match(
            new RegExp(`<td\\b[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/td>`, "i"),
          )?.[1]
          ?.replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .trim() || "";
      const ticker = cell("id_Nazwa"),
        isin = cell("id_ISIN"),
        currency = cell("id_Waluta");
      const symbol = ticker + ".WA";
      if (!valid(symbol) || !/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin) || !currency)
        return [];
      return [
        {
          symbol,
          ticker,
          name: ticker,
          isin,
          currency,
          type: ticker.startsWith("ETC")
            ? "ETC"
            : ticker.startsWith("ETN")
              ? "ETN"
              : ticker.startsWith("ETF")
                ? "ETF"
                : "ETP",
          exchange: "Warsaw",
          mic: "XWAR",
          country: "PL",
          directory: "warsaw",
          source: "Warsaw Stock Exchange ETF table",
          providerSymbolVerified: false,
        },
      ];
    },
  );
  if (!quotes.length)
    throw Error("Warsaw ETF directory format changed or is empty.");
  return { quotes, sourceDate: null };
}
function table(rows, required) {
  const start = rows.findIndex((r) => required.every((k) => r.includes(k)));
  if (start < 0) throw Error("ETF directory columns changed.");
  return rows
    .slice(start + 1)
    .map((r) =>
      Object.fromEntries(rows[start].map((h, i) => [h, clean(r[i])])),
    );
}
export function parseLondon(rows) {
  const quotes = table(rows, [
    "ISIN Code",
    "TIDM",
    "Currency",
    "Instrument Name",
  ])
    .filter((r) => r.TIDM && /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(r["ISIN Code"]))
    .map((r) => ({
      symbol: r.TIDM + ".L",
      ticker: r.TIDM,
      name: r["Instrument Name"],
      isin: r["ISIN Code"],
      currency: r.Currency,
      type:
        { ETFS: "ETF", ETCS: "ETC", ETNS: "ETN" }[r["Mifir Identifier"]] ||
        "ETP",
      exchange: "London Stock Exchange",
      mic: "XLON",
      country: "GB",
      directory: "london",
      source: "London Stock Exchange ETP categorisation",
      providerSymbolVerified: false,
    }))
    .filter((q) => valid(q.symbol));
  if (!quotes.length) throw Error("London ETF directory is empty.");
  return { quotes, sourceDate: null };
}
export function parseEuronext(text) {
  const rows = parseDelimited(text);
  const venues = [
    ["Amsterdam", "Euronext Amsterdam", "XAMS", "NL", ".AS"],
    ["Brussels", "Euronext Brussels", "XBRU", "BE", ".BR"],
    ["Paris", "Euronext Paris", "XPAR", "FR", ".PA"],
    ["ETF Plus", "Euronext Milan", "XMIL", "IT", ".MI"],
    ["Oslo", "Oslo", "XOSL", "NO", ".OL"],
    ["Lisbon", "Euronext Lisbon", "XLIS", "PT", ".LS"],
    ["Dublin", "Euronext Dublin", "XDUB", "IE", ".IR"],
  ];
  let skipped = 0;
  const quotes = table(rows, [
    "Instrument Fullname",
    "ISIN",
    "Symbol",
    "Market",
    "Currency",
  ]).flatMap((r) => {
    if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(r.ISIN || "")) return [];
    const matched = venues.filter((v) => r.Market.includes(v[0]));
    // Multi-currency segments need their own provider identity. Do not alias
    // them to the primary segment and risk valuing USD trades with EUR prices.
    if (!matched.length || /multi-currency/i.test(r.Market)) {
      skipped++;
      return [];
    }
    return matched.flatMap(([, exchange, mic, country, suffix]) => {
      const symbol = r.Symbol + suffix;
      if (!valid(symbol) || !r.ISIN) return [];
      return [
        {
          symbol,
          ticker: r.Symbol,
          name: r["Instrument Fullname"],
          isin: r.ISIN,
          currency: r.Currency,
          type: /\bUCITS\b|\bETF\b/i.test(r["Instrument Fullname"])
            ? "ETF"
            : "ETP",
          exchange,
          mic,
          country,
          directory: "euronext",
          source: "Euronext ETF/ETP directory",
          providerSymbolVerified: false,
        },
      ];
    });
  });
  if (!quotes.length) throw Error("Euronext ETF directory is empty.");
  return {
    quotes,
    sourceDate: rows[2]?.[0] || null,
    skipped,
    notes:
      "Multi-currency segments without a distinct provider symbol are excluded; use Global lookup for an exact listing.",
  };
}
export function parseSwiss(raw) {
  if (
    !Array.isArray(raw.colNames) ||
    !Array.isArray(raw.rowData) ||
    raw.rowData.length < Number(raw.totalRows)
  )
    throw Error("SIX ETF directory is incomplete.");
  const rows = table(
    [raw.colNames, ...raw.rowData],
    ["FundLongName", "ValorSymbol", "ISIN", "TradingBaseCurrency"],
  );
  const quotes = rows.flatMap((r) => {
    // Reuters ticker distinguishes currency lines whose display symbols match.
    const ric = r.FundReutersTicker;
    if (!ric || !/^[A-Z0-9-]+\.S$/i.test(ric)) return [];
    const symbol = ric.replace(/\.S$/i, ".SW").toUpperCase();
    if (!valid(symbol)) return [];
    return [
      {
        symbol,
        ticker: r.ValorSymbol,
        name: r.FundLongName,
        isin: r.ISIN,
        currency: r.TradingBaseCurrency,
        type: "ETF",
        exchange: "SIX Swiss Exchange",
        mic: "XSWX",
        country: "CH",
        directory: "six",
        source: "SIX ETF Explorer",
        providerSymbolVerified: false,
      },
    ];
  });
  if (!quotes.length) throw Error("SIX ETF directory is empty.");
  return { quotes, sourceDate: null, skipped: rows.length - quotes.length };
}
export function parseNordic(raw, market) {
  const rows = raw.data?.instrumentListing?.rows;
  if (!Array.isArray(rows) || !rows.length)
    throw Error("Nordic ETF directory is empty.");
  const venues = {
    STO: ["Nasdaq Stockholm", "XSTO", "SE", ".ST"],
    CPH: ["Nasdaq Copenhagen", "XCSE", "DK", ".CO"],
    HEL: ["Nasdaq Helsinki", "XHEL", "FI", ".HE"],
    ICE: ["Nasdaq Iceland", "XICE", "IS", ".IC"],
    NOR: ["Oslo", "XOSL", "NO", ".OL"],
  };
  if (!venues[market])
    throw Error("An explicit Nordic listing market is required.");
  const quotes = rows.flatMap((r) => {
    const venue = venues[market];
    const [exchange, mic, country, suffix] = venue;
    // These are candidate provider symbols, explicitly unverified until loaded.
    const symbol = r.symbol.toUpperCase().replaceAll(" ", "-") + suffix;
    if (!valid(symbol)) return [];
    return [
      {
        symbol,
        ticker: r.symbol,
        name: r.fullName,
        isin: r.isin,
        currency: r.currency,
        type: "ETF",
        exchange,
        mic,
        country,
        directory: "nordic-" + market,
        source: "Nasdaq Nordic ETF screener",
        providerSymbolVerified: false,
      },
    ];
  });
  const total = Number(raw.data?.pagination?.total || rows.length);
  if (total > rows.length)
    throw Error("Nordic directory pagination requires an update.");
  return {
    quotes,
    sourceDate: null,
    notes: "Nordic provider ticker mappings require quote verification.",
  };
}
