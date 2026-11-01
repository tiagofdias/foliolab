# Alternatives to gettex

Research date: 31 October 2026. Requirement: a permanently free feed usable for European shares and UCITS ETFs in Folio Lab calculations, charts, accounts and demo. gettex is excluded at the user's request.

No replacement satisfying all requirements has been verified. This is a research result, not proof that no such service can exist. No replacement feed has been activated.

| Route | Verified finding | Decision |
| --- | --- | --- |
| Tradegate BSX via Deutsche Börse | Real-time Level 1 product is free of charge until further notice, but technical access is separate. Published Cloud Stream price list lists Tradegate Level 1 access at EUR 400/month excluding VAT. | Fails zero-cost requirement on this documented delivery route. |
| TradingView | Official documentation explicitly says it has no API giving access to data; widgets cannot export data for portfolio calculations. | Embedded charts cannot replace a valuation feed. |
| Leeway | Official live API documentation says securities are delayed 15 minutes; crypto and currencies are real-time. | Does not resolve European real-time equity/ETF requirement. |
| EODHD | Free Starter limited to 20 requests/day and limited EOD/live access; real-time is included in paid packages. | No verified free European streaming entitlement. |
| Finage | Global real-time stocks advertised from USD 899/month; free access is a three-day trial. | Fails permanent zero-cost requirement. |
| Cboe Europe | No retail/nonprofessional end-user fees, but vendor licensing/delivery is separate; site advertises low-cost access and free trials. | No verified zero-cost application feed. |
| Market Data | Official coverage describes US markets and US-traded ETFs. | Does not supply European listings such as VVSM. |
| Lang & Schwarz / stock3 | Free public display exists, but no documented zero-cost data access plus application redistribution entitlement was established in this search. stock3's public API landing page alone establishes neither. | Unresolved; do not present a private website endpoint as an approved feed. |
| lemon.markets | Current brokerage developer documentation exists. Old community SDK claims of free market data do not establish current availability or terms. | Unresolved; old SDK claims are insufficient. |

## Primary sources

- Tradegate product: https://www.mds.deutsche-boerse.com/mds-en/real-time-data/European-spot-markets/Tradegate-BSX-1341022
- Cloud Stream published price list (valid from August 2025): https://www.mds.deutsche-boerse.com/resource/blob/3397408/9e86e47fda46d6844098313a21b65e3b/data/Cloud-Stream-Price_List_1_1.pdf
- Tradegate disclosure, technical retrieval costs and delayed public downloads: https://www.tradegatebsx.com/docs/Disclosure_Provision-market-data-Tradegate.pdf
- TradingView data FAQ: https://www.tradingview.com/widget-docs/faq/data/
- Leeway quote delay: https://leeway.tech/data-api/live/en
- EODHD plans: https://eodhd.com/
- Finage plans: https://finage.co.uk/pricing
- Cboe Europe data: https://www.cboe.com/markets/eu/equities/market-data/
- Market Data coverage: https://www.marketdata.app/data/
- stock3 API landing page: https://api.stock3.com/
- lemon.markets current developer portal: https://developer.lemon.markets/

The project must continue identifying snapshots and delays accurately while access remains unresolved. Polling speed does not establish feed latency. No paid provider, trial-only solution or unsupported real-time label has been added.
