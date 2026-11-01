import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL: "http://127.0.0.1:3318", headless: true },
  webServer: {
    command: "node server/index.mjs",
    env: { PORT: "3318", DB_PATH: ":memory:" },
    url: "http://127.0.0.1:3318",
    reuseExistingServer: false,
  },
  workers: 1,
});
