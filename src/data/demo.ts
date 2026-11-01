import type { MarketQuote, PortfolioActivity, Portfolio } from "../types";
import { ASSETS } from "./catalog";
const DAY = 86400000;
export function demoQuotes(): Record<
  string,
  MarketQuote & {
    asOf: string;
    source: string;
    exchange: string;
    assetClass: string;
  }
> {
  const prices = [
    138, 580, 104, 4.8, 690, 235, 590, 210, 80, 224, 418, 130, 510, 490, 67000,
    2600, 74000, 2900, 5800, 18500, 5000, 19000,
  ];
  return Object.fromEntries(
    ASSETS.map((a, i) => {
      const history = Array.from({ length: 1100 }, (_, d) => {
        const trend = 0.64 + (0.36 * d) / 1099;
        const cycle =
          0.055 * Math.sin(d / 75 + i * 0.12) +
          0.022 * Math.sin(d / 19 + i) +
          0.007 * Math.sin(d * 1.7 + i);
        const crash = 0.13 * Math.exp(-(((d - 730) / 40) ** 2));
        return {
          date: new Date(Date.now() - (1099 - d) * DAY)
            .toISOString()
            .slice(0, 10),
          timestamp: Math.floor(Date.now() / 1000) - (1099 - d) * 86400,
          price:
            prices[i] *
            (trend + cycle - crash * (a.type === "Bond ETF" ? 0.15 : 1)),
        };
      });
      return [
        a.symbol,
        {
          symbol: a.symbol,
          shortName: a.name,
          currency: a.currency,
          history,
          currentPrice: history.at(-1)!.price,
          asOf: new Date().toISOString(),
          source: "Illustrative demo",
          exchange: a.exchange,
          assetClass: a.type,
        },
      ];
    }),
  );
}
export function demoFx() {
  return Object.fromEntries(
    [
      ["USD", 1.1],
      ["GBP", 0.85],
      ["CHF", 0.94],
      ["SEK", 11.2],
      ["NOK", 11.5],
      ["DKK", 7.46],
      ["PLN", 4.3],
      ["CZK", 25],
      ["HUF", 400],
      ["ISK", 145],
      ["RON", 5],
      ["BGN", 1.95583],
      ["TRY", 40],
      ["AUD", 1.65],
      ["CAD", 1.5],
      ["CNY", 7.8],
      ["HKD", 8.5],
      ["ILS", 4],
      ["JPY", 165],
      ["MXN", 20],
      ["NZD", 1.8],
      ["SGD", 1.45],
      ["ZAR", 20],
    ].map(([currency, rate]) => [
      currency,
      Array.from({ length: 1120 }, (_, d) => ({
        date: new Date(Date.now() - (1119 - d) * DAY)
          .toISOString()
          .slice(0, 10),
        rate: Number(rate) * (1 + 0.035 * Math.sin(d / 170)),
      })),
    ]),
  );
}
export function demoWorkspace() {
  const quotes = demoQuotes();
  const portfolios: Portfolio[] = [
    {
      id: "core",
      name: "Long-term investments",
      currency: "EUR",
      color: "#b6a0ff",
      createdAt: "2024-01-01",
    },
    {
      id: "growth",
      name: "Growth & technology",
      currency: "EUR",
      color: "#57cfad",
      createdAt: "2024-01-01",
    },
    {
      id: "digital",
      name: "Digital assets",
      currency: "EUR",
      color: "#f0bd72",
      createdAt: "2024-01-01",
    },
  ];
  const holdings = [
    ["VWCE.DE", 60, "core"],
    ["SXR8.DE", 20, "core"],
    ["AGGH.AS", 750, "core"],
    ["ASML.AS", 8, "growth"],
    ["AAPL", 35, "growth"],
    ["MSFT", 18, "growth"],
    ["BTC-EUR", 0.12, "digital"],
    ["ETH-EUR", 1.8, "digital"],
  ] as const;
  const trades: PortfolioActivity[] = holdings.flatMap(
    ([symbol, quantity, portfolioId], i) =>
      [90 + i * 15, 450 + i * 12, 850 + i * 10].map((index, j) => ({
        id: `demo-${i}-${j}`,
        symbol,
        name: quotes[symbol].shortName,
        type: "BUY" as const,
        quantity: quantity / [2, 3, 6][j],
        unitPrice: quotes[symbol].history[index].price,
        fee: i > 5 ? 2 : 1,
        currency: quotes[symbol].currency,
        portfolioId,
        date: quotes[symbol].history[index].date,
      })),
  );
  return {
    portfolios,
    trades,
    preferences: { currency: "EUR", benchmarks: ["^GSPC", "^STOXX50E"] },
  };
}
