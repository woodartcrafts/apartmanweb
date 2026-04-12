import { defineConfig, devices } from "@playwright/test";

/**
 * Visual Tour Config — tasarım kontrolü için ayrı config.
 * Sunucuların zaten çalıştığını varsayar (reuseExistingServer: true).
 * Çalıştır: npm run visual:tour
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/visual-tour.spec.ts",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "on-failure", outputFolder: "playwright-report/visual-tour" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "off",
    screenshot: "on",
    video: "off",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "visual-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:3000/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm --prefix frontend run dev -- --host --strictPort --port 5173",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
