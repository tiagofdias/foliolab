// Published Yahoo exchange delays, checked 2026-10-31. These describe the
// source's schedule, not an SLA or a measured maximum quote age.
export const DELAY_SOURCE =
  "https://help.yahoo.com/kb/finance/article-exchanges-data-delays-sln2310.html";
export const CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "ISK",
  "RON",
  "BGN",
  "TRY",
  "AUD",
  "CAD",
  "CNY",
  "HKD",
  "ILS",
  "JPY",
  "MXN",
  "NZD",
  "SGD",
  "ZAR",
];
export const EUROPEAN_MARKETS = [
  ["AT", "Austria", "Vienna", "XWBO", ".VI", 15],
  ["BE", "Belgium", "Euronext Brussels", "XBRU", ".BR", 15],
  ["CZ", "Czechia", "Prague", "XPRA", ".PR", 20],
  ["DK", "Denmark", "Nasdaq Copenhagen", "XCSE", ".CO", 0],
  ["EE", "Estonia", "Nasdaq Tallinn", "XTAL", ".TL", 0],
  ["FI", "Finland", "Nasdaq Helsinki", "XHEL", ".HE", 0],
  ["FR", "France", "Euronext Paris", "XPAR", ".PA", 15],
  ["DE", "Germany", "Xetra", "XETR", ".DE", 15],
  ["DE", "Germany", "Frankfurt", "XFRA", ".F", 15],
  ["DE", "Germany", "Stuttgart", "XSTU", ".SG", 15],
  ["DE", "Germany", "Berlin", "XBER", ".BE", 15],
  ["DE", "Germany", "Dusseldorf", "XDUS", ".DU", 15],
  ["DE", "Germany", "Hamburg", "XHAM", ".HM", 15],
  ["DE", "Germany", "Hanover", "XHAN", ".HA", 15],
  ["DE", "Germany", "Munich", "XMUN", ".MU", 15],
  ["GR", "Greece", "Athens", "XATH", ".AT", 15],
  ["HU", "Hungary", "Budapest", "XBUD", ".BD", 15],
  ["IS", "Iceland", "Nasdaq Iceland", "XICE", ".IC", 0],
  ["IE", "Ireland", "Euronext Dublin", "XDUB", ".IR", 15],
  ["IT", "Italy", "Euronext Milan", "XMIL", ".MI", 20],
  ["IT", "Italy", "EuroTLX", "ETLX", ".TI", 20],
  ["LV", "Latvia", "Nasdaq Riga", "XRIS", ".RG", 0],
  ["LT", "Lithuania", "Nasdaq Vilnius", "XLIT", ".VS", 0],
  ["NL", "Netherlands", "Euronext Amsterdam", "XAMS", ".AS", 15],
  ["NO", "Norway", "Oslo", "XOSL", ".OL", 15],
  ["PL", "Poland", "Warsaw", "XWAR", ".WA", 15],
  ["PT", "Portugal", "Euronext Lisbon", "XLIS", ".LS", 15],
  ["RO", "Romania", "Bucharest", "XBSE", ".RO", 15],
  ["ES", "Spain", "Madrid", "XMAD", ".MC", 15],
  ["SE", "Sweden", "Nasdaq Stockholm", "XSTO", ".ST", 0],
  ["CH", "Switzerland", "SIX Swiss Exchange", "XSWX", ".SW", 30],
  ["TR", "Turkey", "Borsa Istanbul", "XIST", ".IS", 15],
  ["GB", "United Kingdom", "London Stock Exchange", "XLON", ".L", 20],
  ["GB", "United Kingdom", "Aquis", "AQSE", ".AQ", 15],
].map(([country, countryName, exchange, mic, suffix, delayMinutes]) => ({
  country,
  countryName,
  exchange,
  mic,
  suffix,
  delayMinutes,
}));
// No mapped feed is not evidence that the country has no ETFs.
export const UNMAPPED_COUNTRIES = [
  ["AL", "Albania"],
  ["AD", "Andorra"],
  ["AM", "Armenia"],
  ["AZ", "Azerbaijan"],
  ["BY", "Belarus"],
  ["BA", "Bosnia and Herzegovina"],
  ["BG", "Bulgaria"],
  ["HR", "Croatia"],
  ["CY", "Cyprus"],
  ["GE", "Georgia"],
  ["XK", "Kosovo"],
  ["LI", "Liechtenstein"],
  ["LU", "Luxembourg"],
  ["MT", "Malta"],
  ["MD", "Moldova"],
  ["MC", "Monaco"],
  ["ME", "Montenegro"],
  ["MK", "North Macedonia"],
  ["RU", "Russia"],
  ["SM", "San Marino"],
  ["RS", "Serbia"],
  ["SK", "Slovakia"],
  ["SI", "Slovenia"],
  ["UA", "Ukraine"],
  ["VA", "Vatican City"],
].map(([country, countryName]) => ({ country, countryName }));
export function marketForSymbol(symbol) {
  return EUROPEAN_MARKETS.find((m) => symbol.endsWith(m.suffix)) || null;
}
export function europeanCoverage(quotes) {
  return [
    ...EUROPEAN_MARKETS.map((m) => {
      const listings = quotes.filter(
        (q) => q.mic === m.mic && q.type === "ETF",
      );
      return {
        ...m,
        listingCount: listings.length,
        directoryStatus: listings.length
          ? "Directory connected"
          : "Global lookup only",
        sourceDate:
          [...new Set(listings.map((q) => q.sourceDate).filter(Boolean))].join(
            ", ",
          ) || null,
      };
    }),
    ...UNMAPPED_COUNTRIES.map((m) => ({
      ...m,
      exchange: "No mapped feed verified",
      mic: "",
      suffix: "",
      delayMinutes: null,
      listingCount: 0,
      directoryStatus: "Coverage gap",
    })),
  ].sort(
    (a, b) =>
      (a.listingCount > 0 ? 0 : a.suffix ? 1 : 2) -
        (b.listingCount > 0 ? 0 : b.suffix ? 1 : 2) ||
      a.countryName.localeCompare(b.countryName) ||
      a.exchange.localeCompare(b.exchange),
  );
}
