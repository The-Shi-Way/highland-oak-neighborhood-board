import { test, expect } from "@playwright/test";

async function loginAsAdmin(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByPlaceholder(/email/i).fill("admin@example.com");
  const passwordField = page.getByPlaceholder(/password/i);
  await passwordField.fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).last().click();
  // Admin role badge visible after login
  await expect(page.getByText(/admin/i).first()).toBeVisible({ timeout: 5000 });
}

test.describe("Admin Dashboard", () => {
  test("admin user sees Admin Panel navigation item", async ({ page }) => {
    await loginAsAdmin(page);
    // Use exact "Admin Panel" label to avoid matching avatar button
    await expect(page.getByRole("button", { name: /admin panel/i })).toBeVisible({ timeout: 3000 });
  });

  test("admin dashboard loads with moderation content", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: /admin panel/i }).click();
    await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible({ timeout: 3000 });
  });

  test("admin dashboard shows reports queue and hidden posts sections", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: /admin panel/i }).click();
    await expect(page.getByRole("heading", { name: /reports queue/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("heading", { name: /hidden posts/i })).toBeVisible({ timeout: 3000 });
  });
});
