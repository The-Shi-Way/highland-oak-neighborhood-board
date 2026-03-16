import { test, expect } from "@playwright/test";

async function loginAsAdmin(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByPlaceholder(/email/i).fill("admin@example.com");
  const passwordField = page.getByPlaceholder(/password/i);
  await passwordField.fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).last().click();
  await expect(page.getByText(/admin/i).first()).toBeVisible({ timeout: 5000 });
}

test.describe("Admin Dashboard", () => {
  test("admin user sees admin navigation item", async ({ page }) => {
    await loginAsAdmin(page);
    // Admin nav button should be visible
    await expect(page.getByRole("button", { name: /admin/i })).toBeVisible({ timeout: 3000 });
  });

  test("admin dashboard loads without error", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: /admin/i }).click();
    await expect(page.getByText(/admin dashboard|reports|moderation/i).first()).toBeVisible({ timeout: 3000 });
  });
});
