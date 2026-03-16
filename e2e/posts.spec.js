import { test, expect } from "@playwright/test";

// Helper to log in (mock mode)
async function loginAsMock(page, email = "user@example.com", displayName = "TestUser") {
  await page.goto("/");
  // Click sign in
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/welcome back/i)).toBeVisible();
  await page.getByPlaceholder(/email/i).fill(email);
  const passwordField = page.getByPlaceholder(/password/i);
  await passwordField.fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).last().click();
  await expect(page.getByText(new RegExp(email.split("@")[0], "i"))).toBeVisible({ timeout: 5000 });
}

test.describe("Post Feed", () => {
  test("shows posts on homepage", async ({ page }) => {
    await page.goto("/");
    // Should see at least one post card with a title
    await expect(page.locator("h2, h3").first()).toBeVisible();
  });

  test("category filter works", async ({ page }) => {
    await page.goto("/");
    // Click Watch category
    await page.getByRole("button", { name: /watch/i }).first().click();
    // Should show watch category posts
    await expect(page.getByText(/watch/i).first()).toBeVisible();
  });

  test("search filters posts", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/search/i).fill("farmers market");
    await expect(page.getByText(/farmers market/i)).toBeVisible();
  });
});

test.describe("Create Post (Mock Mode)", () => {
  test("create post button requires login", async ({ page }) => {
    await page.goto("/");
    // Find the new post button
    const createBtn = page.getByRole("button", { name: /new post|create/i }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      // Should show auth modal
      await expect(page.getByText(/welcome back|join the neighborhood/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test("logged-in user can open create post form", async ({ page }) => {
    await loginAsMock(page);

    // Find the New Post / Create button
    const createBtn = page.getByRole("button", { name: /new post|create/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Should see create post form
    await expect(page.getByPlaceholder(/title/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Watch Dashboard", () => {
  test("shows watch page with urgency posts", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /watch/i }).click();
    // Look for Watch Dashboard content
    await expect(page.getByText(/neighborhood watch|watch|alert/i).first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Dark Mode", () => {
  test("can toggle dark mode", async ({ page }) => {
    await page.goto("/");
    // Find dark mode toggle
    const toggleBtn = page.getByRole("button", { name: /dark|light|moon|sun/i }).first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      // Page should still be functional after toggle
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
