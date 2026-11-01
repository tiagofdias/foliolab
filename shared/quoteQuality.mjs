export function quoteQuality(quote, now = Date.now()) {
  if (!quote)
    return {
      kind: "unavailable",
      label: "No quote",
      detail: "No provider price is available.",
    };
  if (quote.source === "Illustrative demo" || quote.quality === "illustrative")
    return {
      kind: "illustrative",
      label: "Illustrative",
      detail: "Generated sample price; not market data.",
    };
  const marketTime = Date.parse(quote.asOf),
    received = Date.parse(quote.receivedAt || quote.fetchedAt || ""),
    age = Number.isFinite(marketTime) ? Math.max(0, now - marketTime) : null;
  if (quote.quality === "real-time" && quote.source === "Coinbase Exchange") {
    if (quote.liveStatus && quote.liveStatus !== "connected")
      return {
        kind: "stale",
        label: "Stream " + quote.liveStatus,
        detail:
          "The live transport is not healthy. Retaining the last received trade.",
      };
    if (!Number.isFinite(received) || now - received > 90000)
      return {
        kind: "stale",
        label: "No recent tick",
        detail:
          "No recent price delivery. This does not establish whether the venue traded during that interval.",
      };
    if (age === null || age > 180000)
      return {
        kind: "stale",
        label: "Last trade aged",
        detail:
          "Stream delivered a price, but the last trade is more than three minutes old or its timestamp is missing.",
      };
    return {
      kind: "live",
      label: "Live · Coinbase",
      detail:
        "Venue-specific Coinbase Exchange ticker stream; market time and receipt time are separate.",
    };
  }
  const sessionEnd = Number(quote.sessionEnd) * 1000,
    sessionStart = Number(quote.sessionStart) * 1000;
  if (
    Number.isFinite(sessionEnd) &&
    sessionEnd > 0 &&
    (now > sessionEnd || now < sessionStart)
  )
    return {
      kind: "closed",
      label: "Session closed",
      detail:
        "The supplied regular-session window is closed. The displayed price may include a later trade; check its timestamp.",
    };
  if (Number.isFinite(received) && now - received > 5 * 60000)
    return {
      kind: "stale",
      label: "Snapshot stale",
      detail:
        "The last successful snapshot fetch was more than five minutes ago.",
    };
  const documented =
    Number.isFinite(quote.documentedDelay) && quote.documentedDelay > 0
      ? quote.documentedDelay
      : 0;
  const reported =
    Number.isFinite(quote.delay) && quote.delay > 0 ? quote.delay : 0;
  const delay = Math.max(documented, reported);
  if (delay > 0)
    return {
      kind: "delayed",
      label: `${delay} min delayed`,
      detail:
        documented >= reported && documented > 0
          ? "Published exchange delay; actual quote age and refresh time may be longer. Polling does not remove this delay."
          : "Delay reported by the provider; actual quote age may be longer. Polling does not remove this delay.",
    };
  return {
    kind: "unverified",
    label: "Delay unverified",
    detail: "A best-effort snapshot, not a verified real-time exchange feed.",
  };
}
export function validateLiveTick(message, now = Date.now()) {
  if (
    message?.type !== "ticker" ||
    !/^([A-Z0-9]{1,15})-(EUR|USD|GBP)$/.test(message.product_id || "")
  )
    return null;
  const price = Number(message.price),
    time = Date.parse(message.time);
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(time) ||
    time > now + 30000
  )
    return null;
  return {
    symbol: message.product_id,
    price,
    asOf: new Date(time).toISOString(),
    receivedAt: new Date(now).toISOString(),
    bid: Number(message.best_bid) || null,
    ask: Number(message.best_ask) || null,
    source: "Coinbase Exchange",
    quality: "real-time",
  };
}
