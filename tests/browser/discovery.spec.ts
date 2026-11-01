import { test, expect, type Page } from "@playwright/test";
const vvsm = {
  symbol: "VVSM.DE",
  ticker: "VVSM",
  name: "VanEck Semiconductor UCITS ETF",
  currency: "EUR",
  exchange: "Xetra",
  type: "ETF",
  isin: "IE00BMC38736",
  wkn: "A2QC5J",
  source: "Deutsche Börse Xetra",
};
async function openDemo(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the interactive demo" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Portfolio overview" }),
  ).toBeVisible();
}
async function directoryRoutes(page: Page) {
  await page.route("**/api/market/search?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q") || "";
    await route.fulfill({
      json: {
        quotes: /vvsm|IE00BMC38736|semiconductor/i.test(query) ? [vvsm] : [],
        total: 1,
      },
    });
  });
  await page.route("**/api/market/catalog?**", async (route) => {
    const params = new URL(route.request().url()).searchParams,
      offset = Number(params.get("offset") || 0);
    const all = Array.from({ length: 95 }, (_, i) => ({
      ...vvsm,
      symbol: "FUND" + i + ".DE",
      name: "Directory fund " + i,
    }));
    await route.fulfill({
      json: {
        quotes: all.slice(offset, offset + 30),
        total: 95,
        directoryTotal: 18874,
        offset,
        limit: 30,
        hasMore: offset + 30 < 95,
        filters: {
          countries: ["DE", "GB", "CH", "SE"],
          types: ["ETF", "Stock"],
          exchanges: ["Xetra", "Nasdaq"],
          currencies: ["EUR", "USD"],
        },
        sources: [{ label: "Xetra", count: 5542, error: null, stale: false }],
        fetchedAt: new Date().toISOString(),
      },
    });
  });
}

test("European country filter and coverage show actual delay differences and gaps", async ({
  page,
}) => {
  await directoryRoutes(page);
  await page.route("**/api/market/coverage", (route) =>
    route.fulfill({
      json: {
        markets: [
          {
            country: "DE",
            countryName: "Germany",
            exchange: "Xetra",
            listingCount: 3193,
            directoryStatus: "Directory connected",
            delayMinutes: 15,
            suffix: ".DE",
          },
          {
            country: "GB",
            countryName: "United Kingdom",
            exchange: "London Stock Exchange",
            listingCount: 3295,
            directoryStatus: "Directory connected",
            delayMinutes: 20,
            suffix: ".L",
          },
          {
            country: "CH",
            countryName: "Switzerland",
            exchange: "SIX Swiss Exchange",
            listingCount: 2251,
            directoryStatus: "Directory connected",
            delayMinutes: 30,
            suffix: ".SW",
          },
          {
            country: "HR",
            countryName: "Croatia",
            exchange: "No mapped feed verified",
            listingCount: 0,
            directoryStatus: "Coverage gap",
            delayMinutes: null,
          },
        ],
        note: "Published delays are not a guaranteed maximum quote age.",
      },
    }),
  );
  await openDemo(page);
  await page
    .getByRole("button", { name: "Add benchmark", exact: true })
    .click();
  await page.getByLabel("Search assets", { exact: true }).focus();
  await page
    .getByRole("button", { name: "Browse directories", exact: true })
    .click();
  await page.getByLabel("Asset country filter").selectOption("SE");
  await expect(page.getByLabel("Asset country filter")).toHaveValue("SE");
  await page
    .getByRole("button", { name: "European coverage", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "15 min", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "20 min", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "30 min", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Coverage gap", { exact: true })).toBeVisible();
});
test("VVSM lookup works in demo by ticker and ISIN, outside all presets", async ({
  page,
}) => {
  await directoryRoutes(page);
  await openDemo(page);
  await page
    .getByRole("button", { name: "Add benchmark", exact: true })
    .click();
  const search = page.getByLabel("Search assets", { exact: true });
  await search.fill("VVSM");
  await expect(
    page.getByRole("button", { name: /VVSM.DE ETF VanEck Semiconductor/ }),
  ).toBeVisible();
  await expect(page.getByText("ISIN IE00BMC38736 · WKN A2QC5J")).toBeVisible();
  await search.fill("IE00BMC38736");
  await expect(
    page.getByRole("button", { name: /VVSM.DE ETF VanEck Semiconductor/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /VVSM.DE ETF VanEck Semiconductor/ })
    .click();
  await expect(page.getByLabel("Remove benchmark VVSM.DE")).toBeVisible();
  await expect(
    page.getByText(/No illustrative price fixture for: VVSM.DE/),
  ).toBeVisible();
});
test("full directory browsing exposes filters and pagination instead of a sample cap", async ({
  page,
}) => {
  await directoryRoutes(page);
  await openDemo(page);
  await page
    .getByRole("button", { name: "Add benchmark", exact: true })
    .click();
  await page.getByLabel("Search assets", { exact: true }).focus();
  await page
    .getByRole("button", { name: "Browse directories", exact: true })
    .click();
  await expect(
    page.getByText("95 directory listings", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Asset venue filter")).toBeVisible();
  await expect(page.getByRole("button", { name: /FUND0.DE/ })).toBeVisible();
  await page.getByLabel("Next asset page").click();
  await expect(page.getByRole("button", { name: /FUND30.DE/ })).toBeVisible();
  await expect(page.getByText("31–60 of 95")).toBeVisible();
  await page.getByLabel("Asset venue filter").selectOption("Xetra");
  await expect(page.getByRole("button", { name: /FUND0.DE/ })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({
    path: "test-results/directory-browser.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(async () => {
    const box = (await page.locator(".full-directory").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  }).toPass();
});
test("live demo uses provider quotes and a validated stream, while ETF delay stays explicit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class TestEventSource extends EventTarget {
      readyState = 1;
      url: string;
      onerror: ((event: Event) => void) | null = null;
      timer: ReturnType<typeof setInterval>;
      constructor(url: string) {
        super();
        this.url = url;
        this.timer = setInterval(() => {
          this.dispatchEvent(
            new MessageEvent("status", {
              data: JSON.stringify({ status: "connected" }),
            }),
          );
          this.dispatchEvent(
            new MessageEvent("quote", {
              data: JSON.stringify({
                symbol: "BTC-EUR",
                price: 70001,
                asOf: new Date().toISOString(),
                source: "Coinbase Exchange",
                quality: "real-time",
              }),
            }),
          );
        }, 300);
      }
      close() {
        clearInterval(this.timer);
        this.readyState = 2;
      }
    }
    window.EventSource = TestEventSource as unknown as typeof EventSource;
  });
  await directoryRoutes(page);
  await page.route("**/api/market/fx?**", (route) =>
    route.fulfill({
      json: {
        rates: {
          USD: [{ date: "2000-01-01", rate: 1.1 }],
          GBP: [{ date: "2000-01-01", rate: 0.85 }],
          CHF: [{ date: "2000-01-01", rate: 0.95 }],
        },
        asOf: new Date().toISOString().slice(0, 10),
      },
    }),
  );
  await page.route("**/api/market/chart/**", (route) => {
    const symbol = decodeURIComponent(
      new URL(route.request().url()).pathname.split("/").at(-1)!,
    );
    const history = Array.from({ length: 1100 }, (_, i) => ({
      date: new Date(Date.now() - (1099 - i) * 86400000)
        .toISOString()
        .slice(0, 10),
      timestamp: Math.floor(Date.now() / 1000) - (1099 - i) * 86400,
      price: 100 + i / 100,
    }));
    return route.fulfill({
      json: {
        symbol,
        shortName: symbol,
        currency: ["AAPL", "MSFT", "^GSPC"].includes(symbol) ? "USD" : "EUR",
        history,
        currentPrice: 110,
        asOf: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        source: "Test provider snapshot",
        historySource: "Test provider daily history",
        delay: 15,
        quality: "snapshot",
      },
    });
  });
  await openDemo(page);
  await page
    .getByRole("button", { name: "Use live market data", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Use illustrative prices" }),
  ).toBeVisible();
  await expect(page.locator(".holdings .quote-badge.live").first()).toHaveText(
    "Live · Coinbase",
  );
  await expect(
    page.locator(".holdings .quote-badge.delayed").first(),
  ).toHaveText("15 min delayed");
  await page.locator(".market-data-status summary").click();
  await expect(
    page.getByText("Test provider daily history", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use illustrative prices", exact: true })
    .click();
  await expect(page.locator(".holdings .quote-badge.illustrative")).toHaveCount(
    8,
  );
  await expect(page.locator(".holdings .quote-badge.live")).toHaveCount(0);
});
