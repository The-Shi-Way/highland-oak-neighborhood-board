import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Start dev server before tests
  webServer: {
    command: "bun run dev -- --port 3002",
    port: 3002,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
