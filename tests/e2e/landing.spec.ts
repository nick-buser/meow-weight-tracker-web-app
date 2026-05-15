import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
    test("renders the headline and a sign-in entry point", async ({ page }) => {
        await page.goto("/");
        await expect(
            page.getByRole("heading", { name: /Meow Weight Tracker/i }),
        ).toBeVisible();
        await expect(page.getByText(/Sign in/i)).toBeVisible();
        await expect(page.getByRole("button", { name: /Get started/i })).toBeVisible();
    });

    test("dashboard route is protected for anonymous users", async ({
        page,
    }) => {
        const response = await page.goto("/dashboard");
        // Anonymous users must not reach the dashboard. Depending on the
        // Clerk configuration this is either a redirect into the sign-in
        // flow or a blocked (non-OK) response — both count as "protected".
        // A fixed 200-redirect assertion fails under CI's dummy Clerk keys,
        // where auth().protect() returns a 404 instead of redirecting.
        const reachedDashboard =
            /\/dashboard(\/|$)/.test(page.url()) &&
            (response?.ok() ?? false);
        expect(reachedDashboard).toBe(false);
    });
});
