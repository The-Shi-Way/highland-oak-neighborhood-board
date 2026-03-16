import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login and signup buttons when logged out", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("can open signup modal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/join the neighborhood/i)).toBeVisible();
  });

  test("can open login modal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test("mock signup and login flow", async ({ page }) => {
    // This tests the mock mode (no VITE_API_URL)
    await page.goto("/");
    await page.getByRole("button", { name: /create account/i }).click();

    // Fill signup form
    await page.getByPlaceholder(/email/i).fill("testuser@example.com");
    await page.getByPlaceholder(/display name/i).fill("TestUser");
    // Fill password fields
    const passwordFields = await page.getByPlaceholder(/password/i).all();
    if (passwordFields.length >= 2) {
      await passwordFields[0].fill("Password123!");
      await passwordFields[1].fill("Password123!");
    }

    await page.getByRole("button", { name: /create account/i }).last().click();

    // After signup, user should be logged in
    await expect(page.getByText(/TestUser/i)).toBeVisible({ timeout: 5000 });
  });

  test("signup shows validation errors", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /create account/i }).click();
    await page.getByPlaceholder(/email/i).fill("notanemail");
    await page.getByRole("button", { name: /create account/i }).last().click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });
});
