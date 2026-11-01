import { DatabaseSync } from "node:sqlite";
import { createClient } from "@libsql/client";
const schema = [
  "CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,salt TEXT)",
  "CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT,expires INTEGER)",
  "CREATE TABLE IF NOT EXISTS workspaces(userId TEXT PRIMARY KEY,body TEXT)",
];
export async function openDatabase(env = process.env) {
  const remote = env.TURSO_DATABASE_URL;
  if (env.REQUIRE_REMOTE_DB === "true" && (!remote || !env.TURSO_AUTH_TOKEN))
    throw Error(
      "Persistent storage is required. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before deploying.",
    );
  if (remote) {
    const url = new URL(remote);
    if (
      env.REQUIRE_REMOTE_DB === "true" &&
      !["libsql:", "https:", "wss:"].includes(url.protocol)
    )
      throw Error(
        "The deployed database must use an encrypted remote connection.",
      );
    const client = createClient({
      url: remote,
      authToken: env.TURSO_AUTH_TOKEN || undefined,
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
