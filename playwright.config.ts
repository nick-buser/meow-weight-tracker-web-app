import { defineConfig, devices } from "@playwright/test";

/**
 * Locally: reuses an already-running dev server at PLAYWRIGHT_BASE_URL
 * (default http://localhost:3000). In CI: spins up `pnpm start` against
 * the build output and waits for it before running tests.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? "line" : "list",
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: process.env.PLAYWRIGHT_NO_SERVER
        ? undefined
        : {
              command: "pnpm start",
              url: baseURL,
              reuseExistingServer: !process.env.CI,
              timeout: 120_000,
              stdout: "pipe",
              stderr: "pipe",
          },
});
