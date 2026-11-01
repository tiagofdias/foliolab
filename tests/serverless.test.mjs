import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dataDirectory } from "../server/paths.mjs";
test("cloud startup errors return safe JSON and keep credentials out of logs", async () => {
  const secret = "private-test-token-not-a-url";
  const code = `import http from 'node:http';import api from './api/index.mjs';http.createServer(api).listen(3326,'127.0.0.1',()=>console.log('ready'));`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", code], {
    env: {
      ...process.env,
      VERCEL: "1",
      TURSO_DATABASE_URL: secret,
      TURSO_AUTH_TOKEN: secret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });
  try {
    await new Promise((ok, bad) => {
      child.stdout.once("data", ok);
      child.once("error", bad);
      child.once("exit", (c) => bad(Error("exit " + c)));
    });
    const r = await fetch(
      "http://127.0.0.1:3326/api/index?__folio_path=health",
    );
    assert.equal(r.status, 503);
    assert.match(r.headers.get("content-type"), /application\/json/);
    const response = await r.json();
    assert.equal(response.code, "DATABASE_CONFIGURATION");
    assert.match(response.error, /TURSO_DATABASE_URL/);
    assert.ok(!JSON.stringify(response).includes(secret));
    assert.ok(!logs.includes(secret));
  } finally {
    child.kill();
    await new Promise((ok) => child.once("exit", ok));
  }
});
test("cloud caches use temporary storage while local development retains its data directory", () => {
  assert.equal(dataDirectory({}), "data");
  assert.equal(dataDirectory({ VERCEL: "1" }), join(tmpdir(), "folio-lab"));
  assert.equal(
    dataDirectory({ FOLIO_DATA_DIR: "custom-cache", VERCEL: "1" }),
    "custom-cache",
  );
});
test("serverless adapter preserves API paths, queries, parsed bodies and authenticated ownership", async () => {
  const port = 3324;
  const code = `import http from 'node:http';import api from './api/index.mjs';
    http.createServer(async(req,res)=>{
      if(req.headers['x-test-parsed-body']){let body='';for await(const chunk of req)body+=chunk;req.body=JSON.parse(body);}
      await api(req,res);
    }).listen(${port},'127.0.0.1',()=>console.log('ready'));`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", code], {
    env: {
      ...process.env,
      DB_PATH: ":memory:",
      VERCEL: "",
      REQUIRE_REMOTE_DB: "",
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((ok, bad) => {
      child.stdout.once("data", ok);
      child.once("error", bad);
      child.once("exit", (c) => bad(Error("Adapter exited " + c)));
    });
    const request = async (
      path,
      method = "GET",
      body,
      cookie,
      parsed = false,
    ) => {
      const [pathname, query = ""] = path.split("?");
      const r = await fetch(
        `http://127.0.0.1:${port}/api/index?__folio_path=${encodeURIComponent(pathname)}&${query}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(cookie ? { Cookie: cookie } : {}),
            ...(parsed ? { "x-test-parsed-body": "true" } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      return {
        status: r.status,
        data: await r.json(),
        cookie: r.headers.get("set-cookie"),
      };
    };
    assert.equal((await request("health")).status, 200);
    const a = await request(
      "auth/register",
      "POST",
      { email: "adapter@example.com", password: "safe-test-password" },
      undefined,
      true,
    );
    assert.equal(a.status, 200);
    assert.match(a.cookie, /Secure/);
    const cookie = a.cookie.split(";")[0];
    const workspace = {
      portfolios: [
        {
          id: "test",
          name: "Cloud portfolio",
          currency: "EUR",
          color: "#aabbcc",
          createdAt: "2026-01-01",
        },
      ],
      trades: [],
    };
    assert.equal(
      (await request("workspace", "PUT", workspace, cookie, true)).status,
      200,
    );
    assert.deepEqual(
      (await request("workspace", "GET", undefined, cookie)).data,
      workspace,
    );
    assert.equal((await request("workspace")).status, 401);
    // An invalid product must reach the live route with its query intact,
    // fail immediately and never open an upstream market connection.
    assert.equal((await request("market/live?symbols=INVALID")).status, 400);
    assert.equal((await request("unknown-route")).status, 404);
    assert.equal(
      (await request("auth/logout", "POST", {}, cookie)).status,
      200,
    );
    assert.equal(
      (await request("workspace", "GET", undefined, cookie)).status,
      401,
    );
  } finally {
    child.kill();
    await new Promise((ok) => child.once("exit", ok));
  }
});
