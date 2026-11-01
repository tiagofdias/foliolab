# European real-time feed activation

Status: **not activated**. European equity and ETF quotes currently use snapshots; increasing polling frequency cannot establish real-time exchange entitlement.

## Free route to verify

[gettex's official data terms](https://www.gettex.de/en/trading/delayed-data/) offer vendors real-time pre- and post-trade data without direct exchange fees under a bilateral distribution agreement. This is a potential route for Folio Lab, not an approved feed. Any transport/provider fees and redistribution rights must be confirmed before describing the connection as completely free.

Contact: marketdata@gettex.de. A ready-to-review request is in [gettex-access-request.txt](gettex-access-request.txt). It has not been sent.

The public delayed download is 15 minutes delayed and restricted to private use. It must not be substituted for an approved real-time application feed.

## Required provider answers

1. Can a free, open-source, self-hosted portfolio application display and relay quotes to its authenticated users and demo visitors? Clarify hosted and personal installations separately.
2. Are exchange entitlement, transport, credentials, redistribution and display all available at zero cost? Are there user, connection or usage limits?
3. Which feed protocol, endpoint, authentication mechanism, documentation, security master and test environment are available?
4. Confirm coverage of VanEck Semiconductor UCITS ETF, ISIN IE00BMC38736 (Xetra ticker VVSM, WKN A2QC5J), plus VWCE / IE00BK5BQT80, SXR8 / IE00B5BMR087 and EUNL / IE00B4L5Y983. Identify each listing's actual gettex market identifier and quote currency.
5. Provide exchange timestamps, trade and bid/ask semantics, sequence/replay behavior, heartbeat rules, market calendar and delayed/entitlement indicators.
6. Specify attribution, storage, historical chart use, caching, export and derived portfolio valuation permissions.

## Connection acceptance criteria

- Credentials stay on the server. A shared connection fans out only data the agreement permits each client to receive.
- Resolve holdings to feed instruments by ISIN and provider security master. Preserve the holding's listing; separately identify the actual valuation venue. A gettex quote for a VVSM holding must say gettex, not Xetra.
- Keep exchange event time, receipt time, source, venue, native currency, quote type and entitlement. Bid/ask updates are not last trades.
- Mark data real-time only after provider entitlement and a fresh valid stream event are verified. Cached subscription snapshots, reconnects, stale connections and fallback snapshots retain accurate labels.
- Respect exchange hours and holidays. A market-closed last trade is not an active live stream. Test during an open session before claiming working real-time delivery.
- Validate symbol mapping, currency, duplicate/out-of-order messages, disconnects, reconnect backoff and entitlement failures. Keep historical chart provenance separate from current quote provenance.
- Do not silently switch venue or mix quotes from different venues in one intraday price series.

## Other investigated routes

The user's broker is XTB. [XTB's current official help page](https://www.xtb.com/en/help-center/our-platforms/does-xtb-offer-investment-automation-tools) states that API access was discontinued on 14 March 2025 and is no longer available. Its former xAPI is therefore not an integration route for this project. Broker credentials are not required for the independent market-data approach.

[Bavest's documented real-time stream](https://docs.bavest.co/docs/realtime-streaming) supports gettex/Munich trades and quotes by ISIN, but currently describes its WebSocket v2 as an enterprise feature. Do not adopt it under the completely-free requirement without written confirmation of a free entitlement. Its REST quote endpoint can return real-time **or delayed** data.

[gettex's FAQ](https://www.gettex.de/en/about-gettex/faqs/) describes EUR trading and its instrument universe. This does not guarantee every European asset or another exchange's prices. Additional venues require their own confirmed coverage and rights.

No undocumented endpoint, website scraping, paid subscription or unapproved redistribution has been introduced to imply that this dependency is resolved.
