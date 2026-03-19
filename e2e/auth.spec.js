import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows sign in and join now buttons when logged out", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /join now/i })).toBeVisible();
  });

  test("can open signup modal via Join Now", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /join now/i }).click();
    // h2 may include SVG icon in accessible name; use text filter instead
    await expect(page.locator("h2").filter({ hasText: /join the highland oak/i })).toBeVisible();
  });

  test("can open login modal via Sign In", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test("mock signup and login flow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /join now/i }).click();

    // Fill signup form
    await page.getByPlaceholder(/display name/i).fill("TestUser");
    await page.getByPlaceholder(/email/i).fill("testuser@example.com");

    // Fill password fields (password then confirm)
    const passwordFields = await page.getByPlaceholder(/password/i).all();
    if (passwordFields.length >= 2) {
      await passwordFields[0].fill("Password123!");
      await passwordFields[1].fill("Password123!");
    }

    await page.getByRole("button", { name: /create account/i }).last().click();

    // After signup, user should be logged in and display name visible
    await expect(page.getByText(/TestUser/i)).toBeVisible({ timeout: 5000 });
  });

  test("signup shows validation error for invalid email", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /join now/i }).click();
    await page.getByPlaceholder(/email/i).fill("notanemail");
    await page.getByRole("button", { name: /create account/i }).last().click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("can log out after signing in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByPlaceholder(/email/i).fill("testuser@example.com");
    await page.getByPlaceholder(/password/i).fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).last().click();
    await expect(page.getByText(/testuser/i)).toBeVisible({ timeout: 5000 });

    // Sign out
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
