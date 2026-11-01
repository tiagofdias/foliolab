import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("accounts persist, stay isolated, reject unauthenticated writes, and invalidate logout", async () => {
  const dir = mkdtempSync(join(tmpdir(), "folio-test-")),
    port = 3317;
  const child = spawn(process.execPath, ["server/index.mjs"], {
    env: { ...process.env, PORT: String(port), DB_PATH: join(dir, "test.db") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      child.stdout.once("data", resolve);
      child.once("error", reject);
      child.once("exit", (code) => reject(Error("Server exited " + code)));
    });
    const request = async (path, method = "GET", data, cookie) => {
      const r = await fetch(`http://127.0.0.1:${port}/api${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      return {
        status: r.status,
        data: await r.json(),
        cookie: r.headers.get("set-cookie")?.split(";")[0],
      };
    };
    assert.equal((await request("/workspace")).status, 401);
    const a = await request("/auth/register", "POST", {
      email: "a@example.com",
      password: "long-enough-password",
    });
    assert.equal(a.status, 200);
    const b = await request("/auth/register", "POST", {
      email: "b@example.com",
      password: "another-long-password",
    });
    assert.equal(b.status, 200);
    const workspace = {
      preferences: { currency: "EUR", benchmarks: ["^GSPC", "^STOXX50E"] },
      scenarios: [
        {
          id: "scenario",
          name: "European alternative",
          scope: "ALL",
          rules: [
            {
              id: "r",
              sourceSymbol: "AAPL",
              targetSymbol: "VWCE.DE",
              swapPercentage: 50,
              enabled: true,
            },
          ],
        },
      ],
      portfolios: [{ id: "p", name: "Private portfolio" }],
      trades: [
        {
          id: "t",
          name: "Apple",
          symbol: "AAPL",
          portfolioId: "p",
          type: "BUY",
          quantity: 2,
          unitPrice: 100,
          fee: 0,
          currency: "USD",
          date: "2025-01-01",
        },
        {
          id: "eur-trade",
          name: "ASML",
          symbol: "ASML.AS",
          portfolioId: "p",
          type: "BUY",
          quantity: 2,
          unitPrice: 600,
          fee: 1,
          currency: "EUR",
          date: "2025-01-02",
        },
      ],
    };
    assert.equal(
      (await request("/workspace", "PUT", workspace, a.cookie)).status,
      200,
    );
    assert.deepEqual(
      (await request("/workspace", "GET", undefined, a.cookie)).data,
      workspace,
    );
    assert.deepEqual(
      (await request("/workspace", "GET", undefined, b.cookie)).data,
      { portfolios: [], trades: [] },
    );
    const invalid = {
      ...workspace,
      trades: [{ ...workspace.trades[0], type: "SELL" }],
    };
    assert.equal(
      (await request("/workspace", "PUT", invalid, a.cookie)).status,
      400,
    );
    assert.deepEqual(
      (await request("/workspace", "GET", undefined, a.cookie)).data,
      workspace,
    );
    assert.equal(
      (
        await request("/auth/login", "POST", {
          email: "a@example.com",
          password: "incorrect-password",
        })
      ).status,
      401,
    );
    const login = await request("/auth/login", "POST", {
      email: "a@example.com",
      password: "long-enough-password",
    });
    assert.equal(login.status, 200);
    assert.deepEqual(
      (await request("/workspace", "GET", undefined, login.cookie)).data,
      workspace,
    );
    await request("/auth/logout", "POST", undefined, login.cookie);
    assert.equal(
      (await request("/workspace", "GET", undefined, login.cookie)).status,
      401,
    );
    assert.equal(
      (await request("/workspace", "PUT", undefined, b.cookie)).status,
      400,
    );
  } finally {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
