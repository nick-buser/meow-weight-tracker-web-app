import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal Playwright config. Runs against an already-running dev server at
 * PLAYWRIGHT_BASE_URL (default http://localhost:3000). Doesn't spawn the
 * server itself — keeps the test runtime fast and avoids fighting Next.js
 * over ports during CI in the future.
 */
export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? "line" : "list",
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
