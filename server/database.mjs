import { DatabaseSync } from "node:sqlite";
import { createClient } from "@libsql/client";
const schema = [
  "CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,salt TEXT)",
  "CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT,expires INTEGER)",
  "CREATE TABLE IF NOT EXISTS workspaces(userId TEXT PRIMARY KEY,body TEXT)",
];
function configurationError(message) {
  const error = new Error(message);
  error.code = "DATABASE_CONFIGURATION";
  return error;
}
export async function openDatabase(env = process.env) {
  const remote = env.TURSO_DATABASE_URL?.trim();
  const authToken = env.TURSO_AUTH_TOKEN?.trim();
  const requireRemote = env.REQUIRE_REMOTE_DB === "true" || !!env.VERCEL;
  if (requireRemote && (!remote || !authToken))
    throw configurationError(
      "Persistent storage is required. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before deploying.",
    );
  if (remote) {
    let url;
    try {
      url = new URL(remote);
    } catch {
      throw configurationError(
        "TURSO_DATABASE_URL must contain the database connection URL (libsql://...), not the auth token. Put the token in TURSO_AUTH_TOKEN.",
      );
    }
    if (authToken && /^(libsql|https?|wss?):\/\//i.test(authToken))
      throw configurationError(
        "TURSO_AUTH_TOKEN contains a URL. Put the database URL in TURSO_DATABASE_URL and its token in TURSO_AUTH_TOKEN.",
      );
    if (requireRemote && !["libsql:", "https:", "wss:"].includes(url.protocol))
      throw configurationError(
        "The deployed database must use an encrypted remote connection.",
      );
    const client = createClient({
      url: remote,
      authToken: authToken || undefined,
    });
    try {
      await client.batch(schema, "write");
    } catch (e) {
      client.close();
      throw e;
    }
    return {
      mode: "remote",
      prepare(sql) {
        return {
          get: async (...args) => (await client.execute({ sql, args })).rows[0],
          run: async (...args) => client.execute({ sql, args }),
        };
      },
      health: async () => {
        await client.execute("SELECT 1");
      },
      close: () => client.close(),
    };
  }
  const db = new DatabaseSync(env.DB_PATH || "data/folio.db");
  db.exec("PRAGMA journal_mode=WAL;" + schema.join(";"));
  return {
    mode: "local",
    prepare: (sql) => db.prepare(sql),
    health: async () => {
      db.prepare("SELECT 1").get();
    },
    close: () => db.close(),
  };
}
