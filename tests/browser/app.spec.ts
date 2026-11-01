import { test, expect, type Page } from "@playwright/test";
async function demo(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the interactive demo" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Portfolio overview" }),
  ).toBeVisible();
}
test("dark overview, EUR/USD, drag selection and multiple benchmarks", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await demo(page);
  await expect(page.locator("canvas")).toHaveCount(2);
  await expect(page.getByLabel("Reporting currency")).toHaveValue("EUR");
  const euro = await page.locator(".metric>strong").first().textContent();
  await page.getByLabel("Reporting currency").selectOption("USD");
  await expect(page.locator(".metric>strong").first()).not.toHaveText(euro!);
  await page.getByLabel("Reporting currency").selectOption("EUR");
  await page
    .getByRole("button", { name: "Add benchmark", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nasdaq Composite", exact: false })
    .click();
  await expect(
    page.getByLabel("Remove benchmark Nasdaq Composite"),
  ).toBeVisible();
  const canvas = page.locator(".explorer-canvas canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const originalReturn = await page
    .locator(".period-grid strong")
    .first()
    .textContent();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(page.locator(".selection-badge")).toHaveText("SELECTED PERIOD");
  await expect(page.locator(".period-grid strong").first()).not.toHaveText(
    originalReturn!,
  );
  await page.screenshot({
    path: "test-results/selected-period.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "Zoom selection" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zoom selection" }).click();
  await expect(page.getByLabel("Chart start date")).toBeVisible();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.getByRole("button", { name: "3M", exact: true }).click();
  await page.getByRole("button", { name: "Drawdown", exact: true }).click();
  await expect(page.locator("body")).not.toContainText("NaN");
  expect(errors).toEqual([]);
});
test("portfolio and multi-currency transaction CRUD retain demo isolation", async ({
  page,
}) => {
  await demo(page);
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(page.locator(".transactions tbody tr")).toHaveCount(24);
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Symbol", { exact: true }).fill("AAPL");
  await page.getByLabel("Asset name").fill("Apple");
  await page
    .getByLabel("Transaction currency", { exact: true })
    .selectOption("USD");
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByLabel("Unit price (transaction currency)").fill("100");
  await page.getByRole("button", { name: "Save trade", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".transactions tbody tr")).toHaveCount(25);
  await page.getByLabel("Edit transaction").first().click();
  await expect(
    page.getByLabel("Transaction currency", { exact: true }),
  ).toHaveValue("USD");
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Save trade", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Delete transaction").first().click();
  await expect(page.locator(".transactions tbody tr")).toHaveCount(24);
  await page.getByRole("button", { name: "Portfolios", exact: true }).click();
  await page
    .getByRole("button", { name: "Create a portfolio", exact: true })
    .click();
  await page.getByLabel("Portfolio name").fill("Test portfolio");
  await page.getByRole("button", { name: "Save portfolio" }).click();
  await expect(
    page.getByRole("heading", { name: "Test portfolio" }),
  ).toBeVisible();
  await page.getByLabel("Sign out").click();
  await page
    .getByRole("button", { name: "Explore the interactive demo" })
    .click();
  await expect(
    page.getByRole("button", { name: "Test portfolio", exact: true }),
  ).toHaveCount(0);
});
test("deep analytics provides useful charts and synchronized period analysis", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await demo(page);
  await page.getByRole("button", { name: "Analytics", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(7);
  for (const title of [
    "Monthly returns",
    "Drawdown history",
    "Rolling volatility",
    "Good days. Difficult days.",
    "Do your assets move together?",
    "What built your portfolio?",
  ])
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  await page.getByRole("button", { name: "ALL", exact: true }).click();
  expect(
    await page.locator(".heatmap tbody tr").count(),
  ).toBeGreaterThanOrEqual(3);
  await expect(page.locator("body")).not.toContainText("NaN");
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: "test-results/analytics.png", fullPage: true });
});
test("multi-rule lab, saved scenarios, projections, comparisons and rebalancing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await demo(page);
  await page
    .getByRole("button", { name: "What-if lab", exact: false })
    .first()
    .click();
  await expect(page.locator(".substitution-rule")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Add substitution rule", exact: true })
    .click();
  await expect(page.locator(".substitution-rule")).toHaveCount(2);
  await page.getByLabel("Target symbol rule 2").fill("EUNL.DE");
  await page.getByLabel("Replacement percentage rule 1").fill("50");
  await page.getByLabel("Scenario name").fill("Global alternative");
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await expect(
    page
      .locator(".saved-scenarios")
      .getByRole("button", { name: "Global alternative 2 rules", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".lab-results canvas")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "How purchases would change" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1500, height: 1100 });
  await page.screenshot({ path: "test-results/lab.png", fullPage: true });
  await page
    .getByRole("button", { name: "Compare portfolios", exact: true })
    .click();
  await expect(page.getByLabel("Portfolio A")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Future plan", exact: true }).click();
  await page.getByLabel("Monthly contribution", { exact: true }).fill("1000");
  await page.getByLabel("Years", { exact: true }).fill("20");
  await expect(
    page.getByText("In today’s money", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Rebalance", exact: true }).click();
  await page.getByRole("button", { name: "Equal weight", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export plan" })).toBeEnabled();
  await page.getByLabel("VWCE.DE target weight").fill("100");
  await expect(
    page.getByRole("button", { name: "Export plan" }),
  ).toBeDisabled();
  await expect(page.locator("body")).not.toContainText("NaN");
  expect(errors).toEqual([]);
});
test("mobile overview and lab fit the viewport with usable controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demo(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: "What-if lab", exact: false })
    .first()
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Sign out").click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
test("desktop overview screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1100 });
  await demo(page);
  await page.screenshot({ path: "test-results/overview.png", fullPage: true });
});
test("account registration, reporting preferences persistence and logout", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page
    .getByLabel("Email address")
    .fill(`browser-${Date.now()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-test-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Portfolio overview" }),
  ).toBeVisible();
  await page.getByLabel("Reporting currency").selectOption("USD");
  await expect(page.getByLabel("Reporting currency")).toBeEnabled();
  await page
    .getByRole("button", { name: "Create portfolio", exact: true })
    .first()
    .click();
  await page.getByLabel("Portfolio name").fill("My real portfolio");
  await page.getByRole("button", { name: "Save portfolio" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "My real portfolio", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Reporting currency")).toHaveValue("USD");
  await page.getByLabel("Sign out").click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
