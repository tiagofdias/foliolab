import { validateLiveTick } from "../shared/quoteQuality.mjs";
const clients = new Set();
let socket = null,
  reconnect = null,
  lastMessage = 0,
  retry = 0,
  heartbeat = null,
  subscribed = [];
const endpoint = "wss://ws-feed.exchange.coinbase.com";
function send(client, event, data) {
  if (!client.res.destroyed)
    client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
function broadcast(status) {
  for (const client of clients)
    send(client, "status", {
      status,
      source: "Coinbase Exchange",
      time: new Date().toISOString(),
    });
}
function products() {
  return [...new Set([...clients].flatMap((c) => c.symbols))];
}
function subscribe() {
  if (socket?.readyState !== WebSocket.OPEN) return;
  const desired = products(),
    removed = subscribed.filter((s) => !desired.includes(s)),
    added = desired.filter((s) => !subscribed.includes(s));
  if (removed.length)
    socket.send(
      JSON.stringify({
        type: "unsubscribe",
        product_ids: removed,
        channels: ["ticker_batch", "heartbeat"],
      }),
    );
  if (added.length)
    socket.send(
      JSON.stringify({
        type: "subscribe",
        product_ids: added,
        channels: ["ticker_batch", "heartbeat"],
      }),
    );
  subscribed = desired;
}
function connect() {
  if (
    !clients.size ||
    socket?.readyState === WebSocket.OPEN ||
    socket?.readyState === WebSocket.CONNECTING
  )
    return;
  const connection = new WebSocket(endpoint);
  socket = connection;
  subscribed = [];
  broadcast("connecting");
  connection.addEventListener("open", () => {
    if (socket !== connection) return;
    retry = 0;
    lastMessage = Date.now();
    subscribe();
    broadcast("connected");
  });
  connection.addEventListener("message", (event) => {
    if (socket !== connection) return;
    lastMessage = Date.now();
    let data;
    try {
      data = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (data.type === "error") {
      broadcast("provider-error");
      return;
    }
    const tick = validateLiveTick(data);
    if (tick)
      for (const client of clients)
        if (client.symbols.includes(tick.symbol)) send(client, "quote", tick);
  });
  connection.addEventListener("error", () => {
    if (socket !== connection) return;
    broadcast("reconnecting");
    connection.close();
  });
  connection.addEventListener("close", () => {
    if (socket !== connection) return;
    socket = null;
    subscribed = [];
    if (clients.size) {
      broadcast("reconnecting");
      clearTimeout(reconnect);
      reconnect = setTimeout(
        connect,
        Math.min(30000, 1000 * 2 ** Math.min(retry++, 5)),
      );
      reconnect.unref?.();
    }
  });
}
function sync() {
  if (!clients.size) {
    clearTimeout(reconnect);
    clearInterval(heartbeat);
    heartbeat = null;
    const previous = socket;
    socket = null;
    previous?.close();
    return;
  }
  connect();
  subscribe();
  if (!heartbeat) {
    heartbeat = setInterval(() => {
      for (const client of clients) client.res.write(": keep-alive\n\n");
      if (
        socket?.readyState === WebSocket.OPEN &&
        Date.now() - lastMessage > 30000
      ) {
        broadcast("stale");
        socket.close();
      }
    }, 10000);
    heartbeat.unref?.();
  }
}
export function attachLive(req, res, url) {
  const symbols = [
    ...new Set(
      (url.searchParams.get("symbols") || "")
        .split(",")
        .filter((s) => /^[A-Z0-9]{1,15}-(EUR|USD|GBP)$/.test(s)),
    ),
  ].slice(0, 20);
  if (!symbols.length) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Choose supported EUR, USD or GBP crypto pairs.",
      }),
    );
    return;
  }
  if (clients.size >= 100) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Live feed capacity reached. Retry later." }),
    );
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const client = { res, symbols };
  clients.add(client);
  send(client, "status", {
    status: socket?.readyState === WebSocket.OPEN ? "connected" : "connecting",
    source: "Coinbase Exchange",
    time: new Date().toISOString(),
  });
  sync();
  // End cleanly before the 300-second Hobby function limit; EventSource
  // reconnects automatically and status badges downgrade during reconnect.
  const expiry = process.env.VERCEL
    ? setTimeout(() => res.end(), 240000)
    : null;
  const cleanup = () => {
    if (expiry) clearTimeout(expiry);
    if (!clients.has(client)) return;
    clients.delete(client);
    sync();
  };
  req.on("close", cleanup);
  res.on("close", cleanup);
}
