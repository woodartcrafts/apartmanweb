import { expect, test } from "@playwright/test";

const adminIdentifier = process.env.E2E_ADMIN_IDENTIFIER ?? "admin@apartman.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "Admin123!";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Giris" })).toBeVisible();
  await page
    .locator('[data-testid="login-identifier"], input[placeholder*="admin@apartman.local"]')
    .first()
    .fill(adminIdentifier);
  await page
    .locator('[data-testid="login-password"], input[type="password"]')
    .first()
    .fill(adminPassword);
  await page
    .locator('[data-testid="login-submit"], button:has-text("Giris Yap")')
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin/);
}

test.describe("critical admin flows", () => {
  test("admin login", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("link", { name: "Admin Panel" })).toBeVisible();
  });

  test("charge creation flow", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/charges/new");

    await page.getByTestId("charge-apartment-summary").click();
    await page.getByTestId("charge-apartment-option").nth(1).check();

    await page.getByTestId("charge-period-year").fill(String(new Date().getFullYear()));
    await expect(page.getByTestId("charge-type-select")).toHaveValue(/.+/);

    await page.getByTestId("charge-row-0-month").fill(String(new Date().getMonth() + 1));
    await page.getByTestId("charge-row-0-amount").fill("1234.56");

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateText = dueDate.toISOString().slice(0, 10);
    await page.getByTestId("charge-row-0-due-date").fill(dueDateText);
    await page.getByTestId("charge-row-0-description").fill("E2E test tahakkuk kaydi");

    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/admin/charges") && response.request().method() === "POST"
    );

    await page.getByTestId("charge-submit").click();

    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    const body = (await createResponse.json()) as { id?: string; createdCount?: number; createdIds?: string[] };
    expect(Boolean(body.id) || (body.createdCount ?? 0) > 0 || (body.createdIds?.length ?? 0) > 0).toBeTruthy();
  });

  test("payment entry flow", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/charges/new");
    await page.getByTestId("charge-apartment-summary").click();
    await page.getByTestId("charge-apartment-option").nth(1).check();
    await page.getByTestId("charge-period-year").fill(String(new Date().getFullYear()));
    await page.getByTestId("charge-row-0-month").fill(String(new Date().getMonth() + 1));
    await page.getByTestId("charge-row-0-amount").fill("456.78");

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    await page.getByTestId("charge-row-0-due-date").fill(dueDate.toISOString().slice(0, 10));
    await page.getByTestId("charge-row-0-description").fill("E2E payment precondition charge");

    const preChargeResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/admin/charges") && response.request().method() === "POST"
    );
    await page.getByTestId("charge-submit").click();
    const preChargeResponse = await preChargeResponsePromise;
    expect(preChargeResponse.ok()).toBeTruthy();

    await page.goto("/admin/payments/new");

    const apartmentSelect = page.getByTestId("payment-apartment-select");
    const apartmentValue = await apartmentSelect.evaluate((el) => {
      const select = el as HTMLSelectElement;
      const targetOption = Array.from(select.options).find((opt) => opt.text.includes("/ 1 /"));
      return targetOption?.value ?? "";
    });
    expect(apartmentValue).toBeTruthy();
    await apartmentSelect.selectOption(apartmentValue);

    await expect(page.getByTestId("payment-charge-checkbox").first()).toBeVisible();

    await page.getByTestId("payment-charge-checkbox").first().check();

    const today = new Date().toISOString().slice(0, 10);
    await page.getByTestId("payment-paid-at").fill(today);

    const createPaymentResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/admin/payments") && response.request().method() === "POST"
    );
    await page.getByTestId("payment-submit").click();

    const createPaymentResponse = await createPaymentResponsePromise;
    expect(createPaymentResponse.ok()).toBeTruthy();

    const paymentBody = (await createPaymentResponse.json()) as { id?: string };
    expect(paymentBody.id).toBeTruthy();
  });

  test("bank statement import flow placeholder", async () => {
    test.fixme("Will cover /admin/bank-statement with fixture files in next phase.");
  });

  test("expense report flow", async ({ page }) => {
    await loginAsAdmin(page);

    const today = new Date().toISOString().slice(0, 10);
    const uniqueTag = `E2E-EXP-${Date.now()}`;

    await page.goto("/admin/expenses/new");
    await expect(page.getByTestId("expense-item-select")).toHaveValue(/.+/);
    await page.getByTestId("expense-spent-at").fill(today);
    await page.getByTestId("expense-amount").fill("321.45");
    await page.getByTestId("expense-description").fill(uniqueTag);
    await page.getByTestId("expense-reference").fill(uniqueTag);

    const createExpenseResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/admin/expenses") && response.request().method() === "POST"
    );
    await page.getByTestId("expense-submit").click();

    const createExpenseResponse = await createExpenseResponsePromise;
    expect(createExpenseResponse.ok()).toBeTruthy();

    await page.goto("/admin/expenses/report");
    await page.getByTestId("expense-report-from").fill(today);
    await page.getByTestId("expense-report-to").fill(today);

    const reportResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/admin/expenses/report") && response.request().method() === "GET"
    );
    await page.getByTestId("expense-report-run-trigger").click();

    const reportResponse = await reportResponsePromise;
    expect(reportResponse.ok()).toBeTruthy();

    await expect(page.getByTestId("expense-report-table")).toContainText(uniqueTag);
  });
});
