import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { validateLiveTick } from "../../shared/quoteQuality.mjs";
export function useLiveFeed<
  T extends { currentPrice: number; asOf?: string; source?: string },
>(
  symbols: string,
  enabled: boolean,
  setQuotes: Dispatch<SetStateAction<Record<string, T>>>,
) {
  const [status, setStatus] = useState("off");
  const eligible = symbols
    .split(",")
    .filter((s) => /^[A-Z0-9]{1,15}-(EUR|USD|GBP)$/.test(s))
    .sort()
    .join(",");
  useEffect(() => {
    if (!enabled || !eligible) {
      setStatus("off");
      return;
    }
    const stream = new EventSource(
      "/api/market/live?symbols=" + encodeURIComponent(eligible),
    );
    setStatus("connecting");
    function connection(value: string) {
      setStatus(value);
      setQuotes((prev) => {
        const next = { ...prev };
        for (const symbol of eligible.split(",")) {
          const q = prev[symbol] as any;
          if (q?.quality === "real-time")
            next[symbol] = { ...q, liveStatus: value };
        }
        return next;
      });
    }
    stream.addEventListener("status", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        connection(data.status);
      } catch {
        /* ignore malformed event */
      }
    });
    stream.addEventListener("quote", (event) => {
      try {
        const tick = JSON.parse((event as MessageEvent).data);
        const valid = validateLiveTick({
          type: "ticker",
          product_id: tick.symbol,
          price: tick.price,
          time: tick.asOf,
          best_bid: tick.bid,
          best_ask: tick.ask,
        });
        if (!valid) return;
        setStatus("connected");
        setQuotes((prev) => {
          const q = prev[tick.symbol] as any;
          if (!q) return prev;
          if (
            q.quality === "real-time" &&
            Date.parse(q.asOf) > Date.parse(tick.asOf)
          )
            return prev;
          return {
            ...prev,
            [tick.symbol]: {
              ...q,
              currentPrice: valid.price,
              asOf: valid.asOf,
              receivedAt: valid.receivedAt,
              bid: valid.bid,
              ask: valid.ask,
              source: "Coinbase Exchange",
              exchange: "Coinbase Exchange",
              historySource: q.historySource || q.source,
              quality: "real-time",
              delay: 0,
              liveStatus: "connected",
            },
          };
        });
      } catch {
        /* ignore malformed event */
      }
    });
    stream.onerror = () => connection("reconnecting");
    return () => {
      stream.close();
    };
  }, [eligible, enabled, setQuotes]);
  return status;
}
