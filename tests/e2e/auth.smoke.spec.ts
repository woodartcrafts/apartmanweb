import { expect, test } from "@playwright/test";

test.describe("auth smoke", () => {
  test("login page opens", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Giris" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Giris Yap" })).toBeVisible();
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login");

    const textInputs = page.locator('input[type="text"]');
    await textInputs.first().fill("nobody@example.com");
    await page.locator('input[type="password"]').fill("wrongpass1");
    await page.getByRole("button", { name: "Giris Yap" }).click();

    await expect(page.locator(".status-bar")).toContainText(/Invalid credentials|Giris basarisiz|Invalid request/);
  });
});
