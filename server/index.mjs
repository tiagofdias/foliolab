import http from "node:http";
import { openDatabase } from "./database.mjs";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { validateWorkspace } from "../shared/finance.mjs";
import { twelveQuote } from "./twelve.mjs";
import { exchangeRates } from "./fx.mjs";
import {
  catalogPage,
  searchAssets,
  marketCoverage,
  listingForSymbol,
} from "./catalog.mjs";
import {
  CURRENCIES,
  marketForSymbol,
  DELAY_SOURCE,
} from "../shared/markets.mjs";
import { attachLive } from "./live.mjs";
mkdirSync("data", { recursive: true });
const db = await openDatabase();
const hash = (t) => createHash("sha256").update(t).digest("hex"),
  cache = new Map(),
  attempts = new Map(),
  historyCache = new Map();
const json = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
};
async function body(req) {
  let text = "";
  for await (const c of req) {
    text += c;
    if (text.length > 2e6) throw Error("Request too large.");
  }
  return JSON.parse(text || "{}");
}
http
  .createServer(async (req, res) => {
    try {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "same-origin");
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/api/health" && req.method === "GET") {
        try {
          await db.health();
          return json(res, 200, { ok: true });
        } catch {
          return json(res, 503, { ok: false });
        }
      }
      if (url.pathname === "/api/market/coverage" && req.method === "GET")
        return json(res, 200, await marketCoverage());
      if (url.pathname === "/api/market/live" && req.method === "GET")
        return attachLive(req, res, url);
      if (["POST", "PUT", "DELETE"].includes(req.method)) {
        const origin = req.headers.origin;
        if (
          origin &&
          new URL(origin).host !== req.headers.host &&
          !["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin)
        )
          return json(res, 403, { error: "Origin rejected." });
      }
      const token = (req.headers.cookie || "")
        .split("; ")
        .find((s) => s.startsWith("folio_session="))
        ?.split("=")[1];
      const session = token
        ? await db
            .prepare("SELECT userId FROM sessions WHERE token=? AND expires>?")
            .get(hash(token), Date.now())
        : null;
      if (["/api/auth/register", "/api/auth/login"].includes(url.pathname)) {
        if (req.method !== "POST")
          return json(res, 405, { error: "Method not allowed" });
        const ip = req.socket.remoteAddress,
          limit = attempts.get(ip) || { count: 0, until: Date.now() + 900000 };
        if (limit.until < Date.now()) {
          limit.count = 0;
          limit.until = Date.now() + 900000;
        }
        attempts.set(ip, limit);
        if (++limit.count > 30)
          return json(res, 429, {
            error: "Too many attempts. Try again in 15 minutes.",
          });
        const input = await body(req),
          email = String(input.email || "")
            .trim()
            .toLowerCase(),
          password = String(input.password || "");
        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          password.length < 10 ||
          password.length > 256
        )
          throw Error("Use a valid email and a password of 10–256 characters.");
        let user = await db
          .prepare("SELECT * FROM users WHERE email=?")
          .get(email);
        if (url.pathname.endsWith("register")) {
          if (user) throw Error("Unable to create account. Try signing in.");
          const salt = randomBytes(16).toString("hex");
          user = {
            id: randomBytes(16).toString("hex"),
            email,
            salt,
            password: scryptSync(password, salt, 64).toString("hex"),
          };
          await db
            .prepare("INSERT INTO users VALUES(?,?,?,?)")
            .run(user.id, email, user.password, salt);
        } else if (
          !user ||
          !timingSafeEqual(
            Buffer.from(user.password, "hex"),
            scryptSync(password, user.salt, 64),
          )
        )
          return json(res, 401, { error: "Email or password is incorrect." });
        const raw = randomBytes(32).toString("hex");
        await db
          .prepare("INSERT INTO sessions VALUES(?,?,?)")
          .run(hash(raw), user.id, Date.now() + 7 * 86400000);
        res.setHeader(
          "Set-Cookie",
          `folio_session=${raw}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        );
        return json(res, 200, { email: user.email });
      }
      if (url.pathname === "/api/auth/logout" && req.method === "POST") {
        if (token)
          await db
            .prepare("DELETE FROM sessions WHERE token=?")
            .run(hash(token));
        res.setHeader(
          "Set-Cookie",
          "folio_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
        );
        return json(res, 200, { ok: true });
      }
      if (url.pathname === "/api/auth/me")
        return json(res, 200, {
          user: session
            ? await db
                .prepare("SELECT email FROM users WHERE id=?")
                .get(session.userId)
            : null,
        });
      if (url.pathname === "/api/workspace") {
        if (!session)
          return json(res, 401, { error: "Sign in to access your portfolio." });
        if (req.method === "GET") {
          const row = await db
            .prepare("SELECT body FROM workspaces WHERE userId=?")
            .get(session.userId);
          return json(
            res,
            200,
            row ? JSON.parse(row.body) : { portfolios: [], trades: [] },
          );
        }
        if (req.method === "PUT") {
          const data = await body(req);
          validateWorkspace(data);
          await db
            .prepare(
              "INSERT INTO workspaces VALUES(?,?) ON CONFLICT(userId) DO UPDATE SET body=excluded.body",
            )
            .run(session.userId, JSON.stringify(data));
          return json(res, 200, { ok: true });
        }
      }
      if (url.pathname === "/api/market/fx" && req.method === "GET") {
        const from = url.searchParams.get("from") || "2016-01-01";
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
          !Number.isFinite(Date.parse(from)) ||
          new Date(from).toISOString().slice(0, 10) !== from ||
          from < "1999-01-04" ||
          from > new Date().toISOString().slice(0, 10)
        )
          throw Error("Invalid FX history start date (1999 onward).");
        return json(res, 200, await exchangeRates(from));
      }
      if (url.pathname === "/api/market/catalog" && req.method === "GET")
        return json(
          res,
          200,
          await catalogPage(Object.fromEntries(url.searchParams)),
        );
      if (url.pathname === "/api/market/search" && req.method === "GET") {
        const query = (url.searchParams.get("q") || "").trim().slice(0, 80);
        if (query.length < 2) return json(res, 200, { quotes: [] });
        return json(res, 200, await searchAssets(query));
      }
      if (
        url.pathname.startsWith("/api/market/chart/") &&
        req.method === "GET"
      ) {
        const symbol = decodeURIComponent(
          url.pathname.split("/").pop(),
        ).toUpperCase();
        if (!/^[A-Z0-9.^=-]{1,24}$/.test(symbol))
          throw Error("Invalid symbol.");
        const hit = cache.get(symbol);
        if (hit && hit.expires > Date.now()) return json(res, 200, hit.data);
        if (process.env.TWELVE_DATA_API_KEY) {
          const data = await twelveQuote(symbol);
          cache.set(symbol, { data, expires: Date.now() + 60000 });
          return json(res, 200, data);
        }
        const historical = historyCache.get(symbol),
          reuseHistory = historical && historical.expires > Date.now();
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${reuseHistory ? "5d" : "10y"}&interval=1d`,
          {
            signal: AbortSignal.timeout(15000),
            headers: { "User-Agent": "Mozilla/5.0" },
          },
        );
        if (!response.ok)
          throw Error(
            response.status === 404
              ? "No quote coverage for this exact listing. Try another listing for the same ISIN."
              : `Market provider unavailable (${response.status}). Retry later.`,
          );
        const raw = await response.json(),
          r = raw.chart?.result?.[0];
        if (!r) throw Error("Asset not found.");
        const closes = r.indicators?.quote?.[0]?.close || [];
        const recent = (r.timestamp || []).flatMap((ts, i) =>
          Number.isFinite(closes[i]) && closes[i] > 0
            ? [
                {
                  date: new Date(ts * 1000).toISOString().slice(0, 10),
                  timestamp: ts,
                  price: closes[i],
                },
              ]
            : [],
        );
        const history = [
          ...new Map(
            [...(reuseHistory ? historical.history : []), ...recent].map(
              (p) => [p.date, p],
            ),
          ).values(),
        ].sort((a, b) => a.date.localeCompare(b.date));
        if (!reuseHistory)
          historyCache.set(symbol, { history, expires: Date.now() + 86400000 });
        if (cache.size > 500) {
          cache.clear();
          historyCache.clear();
        }
        const data = {
          symbol,
          shortName: r.meta.shortName || symbol,
          currency: r.meta.currency,
          currentPrice: r.meta.regularMarketPrice,
          history,
          asOf: new Date(r.meta.regularMarketTime * 1000).toISOString(),
          fetchedAt: new Date().toISOString(),
          source: "Yahoo Finance (unofficial)",
          delay: r.meta.exchangeDataDelayedBy ?? null,
          documentedDelay: marketForSymbol(symbol)?.delayMinutes ?? null,
          delaySource: marketForSymbol(symbol) ? DELAY_SOURCE : null,
          exchange: r.meta.fullExchangeName || r.meta.exchangeName,
          assetClass: r.meta.instrumentType,
          historySource: "Yahoo Finance (unofficial) · daily closes",
          quality: "snapshot",
          sessionStart: r.meta.currentTradingPeriod?.regular?.start || null,
          sessionEnd: r.meta.currentTradingPeriod?.regular?.end || null,
        };
        // A known directory currency mismatch must not become a silent venue
        // substitution. Do not make quote availability depend on directories.
        let listing;
        try {
          listing = await listingForSymbol(symbol);
        } catch (e) {
          if (e.message.includes("multiple directory")) throw e;
        }
        const major = (c) => (c === "GBp" || c === "GBX" ? "GBP" : c);
        if (
          listing?.currency &&
          major(listing.currency) !== major(data.currency)
        )
          throw Error(
            `Directory lists ${listing.currency}, but the price provider returned ${data.currency} for ${symbol}. Select an exact alternative currency listing.`,
          );
        if (
          !Number.isFinite(data.currentPrice) ||
          ![...CURRENCIES, "GBp", "GBX"].includes(data.currency)
        )
          throw Error(
            "This listing currency is not supported by the reference FX feed. Choose another listing currency.",
          );
        cache.set(symbol, { data, expires: Date.now() + 60000 });
        return json(res, 200, data);
      }
      if (url.pathname.startsWith("/api/"))
        return json(res, 404, { error: "Endpoint not found." });
      const root = resolve("dist");
      let file = resolve(root, "." + decodeURIComponent(url.pathname));
      if (
        !file.startsWith(root + sep) ||
        !existsSync(file) ||
        statSync(file).isDirectory()
      )
        file = resolve(root, "index.html");
      const mime = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      };
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
      });
      res.end(readFileSync(file));
    } catch (e) {
      json(res, 400, { error: e.message || "Request failed." });
    }
  })
  .listen(Number(process.env.PORT || 3001), process.env.HOST || "0.0.0.0", () =>
    console.log("Folio Lab: http://localhost:" + (process.env.PORT || 3001)),
  );
