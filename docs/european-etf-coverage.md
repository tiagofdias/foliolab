# European ETF coverage audit

Checked 2026-10-31T22:06:24.385Z. Accepted policy: delayed quotes are suitable for portfolio analysis. **A universal 15-minute maximum is not available on the current source.**

29,425 total indexed listings across European, US and crypto directories. 35 ambiguous provider symbols are excluded to prevent mixing instruments or trading currencies.

Directory coverage and successful quote coverage are different. The checks below sample representative listings; they do not certify every ETF. An unconnected directory or unmapped feed does not establish that a country has no ETFs. European exposure, fund domicile and listing country are different concepts.

## Connected sources

| Source | Reference rows | State |
| --- | ---: | --- |
| [Warsaw ETFs](https://www.gpw.pl/ajaxindex.php) | 44 | Fetched |
| [Xetra](https://www.cashmarket.deutsche-boerse.com/cash-en/trading/Tradable-Instruments-Xetra/xetra) | 5542 | Fetched |
| [London ETFs & ETPs](https://www.londonstockexchange.com/content/dam/lse/en_us/documents/reports/etf-and-etp-categorisation.xlsx) | 4312 | Fetched |
| [Euronext ETFs & ETPs](https://live.euronext.com/en/products/etfs/list) | 3947 | Fetched; 418 unmapped rows excluded |
| [SIX ETFs](https://www.six-group.com/fqs/ref.json?select=FundLongName,ValorSymbol,FundReutersTicker,ISIN,TradingBaseCurrency,ValorId&where=ProductLine=ET*PortalSegment=FU&orderby=FundLongName&page=1&pagesize=99999) | 2295 | Fetched; 52 unmapped rows excluded |
| [Nasdaq Nordic Stockholm ETFs](https://api.nasdaq.com/api/nordic/screener/etp?category=ETF&tableonly=false&market=STO) | 28 | Fetched |
| [Nasdaq Nordic Helsinki ETFs](https://api.nasdaq.com/api/nordic/screener/etp?category=ETF&tableonly=false&market=HEL) | 1 | Fetched |
| [Nasdaq Nordic Copenhagen ETFs](https://api.nasdaq.com/api/nordic/screener/etp?category=ETF&tableonly=false&market=CPH) | 1 | Fetched |
| [Nasdaq Nordic Norway ETFs](https://api.nasdaq.com/api/nordic/screener/etp?category=ETF&tableonly=false&market=NOR) | 1 | Fetched |
| [Nasdaq Nordic Iceland ETFs](https://api.nasdaq.com/api/nordic/screener/etp?category=ETF&tableonly=false&market=ICE) | 1 | Fetched |
| [US listings](https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt) | 12871 | Fetched |
| [Coinbase fiat pairs](https://api.exchange.coinbase.com/products) | 461 | Fetched |

Counts in the next table describe indexed ETFs; ETCs, ETNs and uncertain ETP classifications remain separate. Source publication dates are shown in the app when supplied; a fetch date is not a publication date.

## Country and venue coverage

| Country | Venue | ETF listings | Directory state | Published source delay |
| --- | --- | ---: | --- | --- |
| Belgium | Euronext Brussels (.BR) | 13 | Directory connected | 15 min |
| Denmark | Nasdaq Copenhagen (.CO) | 1 | Directory connected | Source lists real-time; snapshot latency unverified |
| Finland | Nasdaq Helsinki (.HE) | 1 | Directory connected | Source lists real-time; snapshot latency unverified |
| France | Euronext Paris (.PA) | 676 | Directory connected | 15 min |
| Germany | Xetra (.DE) | 3193 | Directory connected | 15 min |
| Iceland | Nasdaq Iceland (.IC) | 1 | Directory connected | Source lists real-time; snapshot latency unverified |
| Italy | Euronext Milan (.MI) | 2083 | Directory connected | 20 min |
| Netherlands | Euronext Amsterdam (.AS) | 352 | Directory connected | 15 min |
| Norway | Oslo (.OL) | 1 | Directory connected | 15 min |
| Poland | Warsaw (.WA) | 32 | Directory connected | 15 min |
| Sweden | Nasdaq Stockholm (.ST) | 28 | Directory connected | Source lists real-time; snapshot latency unverified |
| Switzerland | SIX Swiss Exchange (.SW) | 2216 | Directory connected | 30 min |
| United Kingdom | London Stock Exchange (.L) | 3295 | Directory connected | 20 min |
| Austria | Vienna (.VI) | 0 | Global lookup only | 15 min |
| Czechia | Prague (.PR) | 0 | Global lookup only | 20 min |
| Estonia | Nasdaq Tallinn (.TL) | 0 | Global lookup only | Source lists real-time; snapshot latency unverified |
| Germany | Berlin (.BE) | 0 | Global lookup only | 15 min |
| Germany | Dusseldorf (.DU) | 0 | Global lookup only | 15 min |
| Germany | Frankfurt (.F) | 0 | Global lookup only | 15 min |
| Germany | Hamburg (.HM) | 0 | Global lookup only | 15 min |
| Germany | Hanover (.HA) | 0 | Global lookup only | 15 min |
| Germany | Munich (.MU) | 0 | Global lookup only | 15 min |
| Germany | Stuttgart (.SG) | 0 | Global lookup only | 15 min |
| Greece | Athens (.AT) | 0 | Global lookup only | 15 min |
| Hungary | Budapest (.BD) | 0 | Global lookup only | 15 min |
| Ireland | Euronext Dublin (.IR) | 0 | Global lookup only | 15 min |
| Italy | EuroTLX (.TI) | 0 | Global lookup only | 20 min |
| Latvia | Nasdaq Riga (.RG) | 0 | Global lookup only | Source lists real-time; snapshot latency unverified |
| Lithuania | Nasdaq Vilnius (.VS) | 0 | Global lookup only | Source lists real-time; snapshot latency unverified |
| Portugal | Euronext Lisbon (.LS) | 0 | Global lookup only | 15 min |
| Romania | Bucharest (.RO) | 0 | Global lookup only | 15 min |
| Spain | Madrid (.MC) | 0 | Global lookup only | 15 min |
| Turkey | Borsa Istanbul (.IS) | 0 | Global lookup only | 15 min |
| United Kingdom | Aquis (.AQ) | 0 | Global lookup only | 15 min |
| Albania | No mapped feed verified | 0 | Coverage gap | Unverified |
| Andorra | No mapped feed verified | 0 | Coverage gap | Unverified |
| Armenia | No mapped feed verified | 0 | Coverage gap | Unverified |
| Azerbaijan | No mapped feed verified | 0 | Coverage gap | Unverified |
| Belarus | No mapped feed verified | 0 | Coverage gap | Unverified |
| Bosnia and Herzegovina | No mapped feed verified | 0 | Coverage gap | Unverified |
| Bulgaria | No mapped feed verified | 0 | Coverage gap | Unverified |
| Croatia | No mapped feed verified | 0 | Coverage gap | Unverified |
| Cyprus | No mapped feed verified | 0 | Coverage gap | Unverified |
| Georgia | No mapped feed verified | 0 | Coverage gap | Unverified |
| Kosovo | No mapped feed verified | 0 | Coverage gap | Unverified |
| Liechtenstein | No mapped feed verified | 0 | Coverage gap | Unverified |
| Luxembourg | No mapped feed verified | 0 | Coverage gap | Unverified |
| Malta | No mapped feed verified | 0 | Coverage gap | Unverified |
| Moldova | No mapped feed verified | 0 | Coverage gap | Unverified |
| Monaco | No mapped feed verified | 0 | Coverage gap | Unverified |
| Montenegro | No mapped feed verified | 0 | Coverage gap | Unverified |
| North Macedonia | No mapped feed verified | 0 | Coverage gap | Unverified |
| Russia | No mapped feed verified | 0 | Coverage gap | Unverified |
| San Marino | No mapped feed verified | 0 | Coverage gap | Unverified |
| Serbia | No mapped feed verified | 0 | Coverage gap | Unverified |
| Slovakia | No mapped feed verified | 0 | Coverage gap | Unverified |
| Slovenia | No mapped feed verified | 0 | Coverage gap | Unverified |
| Ukraine | No mapped feed verified | 0 | Coverage gap | Unverified |
| Vatican City | No mapped feed verified | 0 | Coverage gap | Unverified |

## Quote and historical-data probes

| Listing | Quote available | Native currency | Daily history points | Published delay |
| --- | --- | --- | ---: | --- |
| VVSM.DE | Yes | EUR | 1497 | 15 min |
| CSPX.AS | Yes | EUR | 2558 | 15 min |
| CW8.PA | Yes | EUR | 2561 | 15 min |
| BEL.BR | Yes | EUR | 2560 | 15 min |
| VWCE.MI | Yes | EUR | 1729 | 20 min |
| SMH.L | Yes | USD | 1492 | 20 min |
| CSSPX.SW | Yes | USD | 2513 | 30 min |
| XACT-OMXS30.ST | Yes | SEK | 2109 | 0 min |
| XACTC25.CO | Yes | DKK | 1935 | 0 min |
| SLG-OMXH25.HE | Yes | EUR | 2512 | 0 min |
| LEQ.IC | Yes | ISK | 1039 | 0 min |
| DNBNOR-OBXO.OL | Yes | NOK | 1 | 15 min |
| ETFBW20TR.WA | Yes | PLN | 1956 | 15 min |
| LYXIB.MC | Yes | EUR | 2559 | 15 min |

Short or missing historical series cannot support a full historical backtest. The application withholds analyses without sufficient history. These checks occurred outside normal European trading hours; they verify retrieval and history availability, not live-session latency.

## Known gaps

- Global lookup is available beyond connected directories, but is not a complete exchange security master. Countries marked Coverage gap have no verified mapped feed in this implementation.
- Euronext multi-currency segments without a distinct supported price-provider symbol and SIX rows without a usable ticker mapping are excluded. Conflicting symbol/currency identities are excluded instead of silently merged.
- Some provider symbols remain unverified candidates until a quote loads. Known directory/quote currency mismatches are rejected. The price provider is unofficial and can have missing listings, limited history or outages.
- Cached metadata is retained during source failures and labelled as cached. This is not a guarantee of all European ETFs or all exchange listings.
- Current quotes and historical FX have different schedules. FX uses dated daily reference rates, not intraday exchange rates.

Delay schedule: [Yahoo exchange and provider table](https://help.yahoo.com/kb/finance/article-exchanges-data-delays-sln2310.html). The app uses the larger positive value of the provider-reported and published exchange delay; zero does not establish a verified live stream.

Reproduce: start Folio Lab, then run `npm run audit:markets`. Set `FOLIO_API_URL` if the API runs on another port. Machine-readable results are saved to `data/european-coverage-audit.json`.
