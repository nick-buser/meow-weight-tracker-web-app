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
        // Clerk's middleware redirects unauthenticated users to /sign-in.
        // We assert the final URL is somewhere on the auth flow and the
        // page rendered without crashing.
        expect(response?.ok()).toBe(true);
        await expect(page).toHaveURL(/\/(sign-in|$)/);
    });
});
