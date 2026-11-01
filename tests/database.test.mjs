import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { openDatabase } from "../server/database.mjs";
for (const mode of ["local", "libsql"])
  test(`${mode} database preserves accounts, sessions and isolated workspaces across reopen`, async () => {
    const dir = await mkdtemp(join(tmpdir(), "folio-db-"));
    const path = join(dir, "test.db");
    const env =
      mode === "local"
        ? { DB_PATH: path }
        : { TURSO_DATABASE_URL: pathToFileURL(path).href };
    let db;
    try {
      db = await openDatabase(env);
      await db
        .prepare("INSERT INTO users VALUES(?,?,?,?)")
        .run("one", "one@example.com", "hash", "salt");
      await db
        .prepare("INSERT INTO sessions VALUES(?,?,?)")
        .run("session-hash", "one", Date.now() + 60000);
      await db
        .prepare(
          "INSERT INTO workspaces VALUES(?,?) ON CONFLICT(userId) DO UPDATE SET body=excluded.body",
        )
        .run("one", JSON.stringify({ portfolios: [{ id: "p" }], trades: [] }));
      await assert.rejects(async () =>
        db
          .prepare("INSERT INTO users VALUES(?,?,?,?)")
          .run("two", "one@example.com", "hash", "salt"),
      );
      db.close();
      db = await openDatabase(env);
      await db.health();
      assert.equal(
        (await db.prepare("SELECT email FROM users WHERE id=?").get("one"))
          .email,
        "one@example.com",
      );
      assert.equal(
        (
          await db
            .prepare("SELECT userId FROM sessions WHERE token=?")
            .get("session-hash")
        ).userId,
        "one",
      );
      assert.equal(
        JSON.parse(
          (
            await db
              .prepare("SELECT body FROM workspaces WHERE userId=?")
              .get("one")
          ).body,
        ).portfolios[0].id,
        "p",
      );
      assert.equal(
        await db
          .prepare("SELECT body FROM workspaces WHERE userId=?")
          .get("two"),
        undefined,
      );
    } finally {
      db?.close();
      await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });
test("Render deployment refuses missing credentials and local or unencrypted storage", async () => {
  await assert.rejects(
    openDatabase({ REQUIRE_REMOTE_DB: "true" }),
    /Persistent storage/,
  );
  await assert.rejects(
    openDatabase({
      REQUIRE_REMOTE_DB: "true",
      TURSO_DATABASE_URL: "file:temporary.db",
      TURSO_AUTH_TOKEN: "test",
    }),
    /encrypted remote/,
  );
  await assert.rejects(
    openDatabase({
      REQUIRE_REMOTE_DB: "true",
      TURSO_DATABASE_URL: "http://localhost:8080",
      TURSO_AUTH_TOKEN: "test",
    }),
    /encrypted remote/,
  );
});
