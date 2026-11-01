export interface Asset {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  type: string;
  isin?: string;
  wkn?: string;
  ticker?: string;
  source?: string;
  directory?: string;
  providerSymbolVerified?: boolean;
  country?: string;
  mic?: string;
}
export const ASSETS: Asset[] = [
  {
    symbol: "VWCE.DE",
    name: "Vanguard FTSE All-World UCITS ETF",
    currency: "EUR",
    exchange: "Xetra",
    type: "ETF",
  },
  {
    symbol: "SXR8.DE",
    name: "iShares Core S&P 500 UCITS ETF",
    currency: "EUR",
    exchange: "Xetra",
    type: "ETF",
  },
  {
    symbol: "EUNL.DE",
    name: "iShares Core MSCI World UCITS ETF",
    currency: "EUR",
    exchange: "Xetra",
    type: "ETF",
  },
  {
    symbol: "AGGH.AS",
    name: "iShares Core Global Aggregate Bond UCITS ETF",
    currency: "EUR",
    exchange: "Amsterdam",
    type: "Bond ETF",
  },
  {
    symbol: "ASML.AS",
    name: "ASML Holding",
    currency: "EUR",
    exchange: "Amsterdam",
    type: "Stock",
  },
  {
    symbol: "SAP.DE",
    name: "SAP SE",
    currency: "EUR",
    exchange: "Xetra",
    type: "Stock",
  },
  {
    symbol: "MC.PA",
    name: "LVMH",
    currency: "EUR",
    exchange: "Paris",
    type: "Stock",
  },
  {
    symbol: "SIE.DE",
    name: "Siemens",
    currency: "EUR",
    exchange: "Xetra",
    type: "Stock",
  },
  {
    symbol: "NESN.SW",
    name: "Nestlé",
    currency: "CHF",
    exchange: "SIX Swiss",
    type: "Stock",
  },
  {
    symbol: "AAPL",
    name: "Apple",
    currency: "USD",
    exchange: "Nasdaq",
    type: "Stock",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    currency: "USD",
    exchange: "Nasdaq",
    type: "Stock",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    currency: "USD",
    exchange: "Nasdaq",
    type: "Stock",
  },
  {
    symbol: "VOO",
    name: "Vanguard S&P 500 ETF",
    currency: "USD",
    exchange: "NYSE Arca",
    type: "ETF",
  },
  {
    symbol: "QQQ",
    name: "Invesco Nasdaq 100 ETF",
    currency: "USD",
    exchange: "Nasdaq",
    type: "ETF",
  },
  {
    symbol: "BTC-EUR",
    name: "Bitcoin / Euro",
    currency: "EUR",
    exchange: "Crypto",
    type: "Crypto",
  },
  {
    symbol: "ETH-EUR",
    name: "Ethereum / Euro",
    currency: "EUR",
    exchange: "Crypto",
    type: "Crypto",
  },
  {
    symbol: "BTC-USD",
    name: "Bitcoin / US Dollar",
    currency: "USD",
    exchange: "Crypto",
    type: "Crypto",
  },
  {
    symbol: "ETH-USD",
    name: "Ethereum / US Dollar",
    currency: "USD",
    exchange: "Crypto",
    type: "Crypto",
  },
  {
    symbol: "^GSPC",
    name: "S&P 500",
    currency: "USD",
    exchange: "US index",
    type: "Index",
  },
  {
    symbol: "^IXIC",
    name: "Nasdaq Composite",
    currency: "USD",
    exchange: "US index",
    type: "Index",
  },
  {
    symbol: "^STOXX50E",
    name: "EURO STOXX 50",
    currency: "EUR",
    exchange: "Eurozone index",
    type: "Index",
  },
  {
    symbol: "^GDAXI",
    name: "DAX (performance index)",
    currency: "EUR",
    exchange: "German index",
    type: "Index",
  },
];
export const BENCHMARKS = [
  "^GSPC",
  "^IXIC",
  "^STOXX50E",
  "^GDAXI",
  "VWCE.DE",
  "EUNL.DE",
  "SXR8.DE",
  "QQQ",
  "BTC-EUR",
];
export const COLORS = [
  "#b6a0ff",
  "#57cfad",
  "#f0bd72",
  "#72acfa",
  "#e58caa",
  "#98ba70",
  "#7dcbd0",
  "#caa27b",
  "#d1c75f",
  "#dc9b73",
];
export const labelFor = (symbol: string) =>
  ASSETS.find((a) => a.symbol === symbol)?.name || symbol;
export function assetType(symbol: string, quote?: { assetClass?: string }) {
  return (
    ASSETS.find((a) => a.symbol === symbol)?.type ||
    {
      ETF: "ETF",
      EQUITY: "Stock",
      CRYPTOCURRENCY: "Crypto",
      INDEX: "Index",
      MUTUALFUND: "Fund",
    }[quote?.assetClass || ""] ||
    (symbol.includes("-EUR") ||
    symbol.includes("-USD") ||
    symbol.includes("-GBP")
      ? "Crypto"
      : symbol.startsWith("^")
        ? "Index"
        : "Other")
  );
}
export const formatMoney = (value: number, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
export const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
