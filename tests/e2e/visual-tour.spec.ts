/**
 * Visual Tour — Admin sayfaları tasarım kontrolü
 *
 * Her admin sayfasına gider, yüklenmesini bekler ve tam sayfa screenshot çeker.
 * Screenshot'lar playwright-test-results/visual-tour/ klasörüne kaydedilir.
 *
 * Çalıştır: npm run visual:tour
 * (Sunucuların çalışıyor olması gerekir: API :3000, Frontend :5173)
 */

import * as fs from "fs";
import * as path from "path";
import { expect, test } from "@playwright/test";

// ── Kimlik bilgileri ─────────────────────────────────────────────────────────
const ADMIN_ID = process.env.E2E_ADMIN_IDENTIFIER ?? "admin@apartman.local";
const ADMIN_PW = process.env.E2E_ADMIN_PASSWORD ?? "Admin123!";

// ── Screenshot çıktı dizini ──────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "screenshots",
  "visual-tour",
  today
);

// ── Ziyaret edilecek sayfalar ────────────────────────────────────────────────
const PAGES: { label: string; path: string }[] = [
  // Giriş
  { label: "01-login", path: "/login" },

  // Raporlar
  { label: "02-reports-dashboard", path: "/admin/reports" },
  { label: "03-reports-bank-statement", path: "/admin/reports/bank-statement" },
  { label: "04-reports-overdue-payments", path: "/admin/reports/overdue-payments" },
  { label: "05-reports-charge-consistency", path: "/admin/reports/charge-consistency" },
  { label: "06-reports-staff-open-aidat", path: "/admin/reports/staff-open-aidat" },
  { label: "07-reports-manual-review-matches", path: "/admin/reports/manual-review-matches" },
  { label: "08-reports-monthly-balance-matrix", path: "/admin/reports/monthly-balance-matrix" },
  { label: "09-reports-reference-search", path: "/admin/reports/reference-search" },
  { label: "10-reports-fractional-closures", path: "/admin/reports/fractional-closures" },
  { label: "11-reports-monthly-ledger-print", path: "/admin/reports/monthly-ledger-print" },
  { label: "12-reports-bank-movements", path: "/admin/reports/bank-movements" },
  { label: "13-reports-apartments-list", path: "/admin/reports/apartments/list" },

  // Daireler
  { label: "14-apartments-list", path: "/admin/apartments/list" },
  { label: "15-apartments-new", path: "/admin/apartments/new" },
  { label: "16-apartments-upload", path: "/admin/apartments/upload" },
  { label: "17-apartments-bulk-update", path: "/admin/apartments/bulk-update" },
  { label: "18-apartments-history", path: "/admin/apartments/history" },
  { label: "19-apartments-passwords", path: "/admin/apartments/passwords" },

  // Tahakkuk
  { label: "20-charge-types", path: "/admin/charge-types" },
  { label: "21-charges-new", path: "/admin/charges/new" },
  { label: "22-charges-bulk", path: "/admin/charges/bulk" },
  { label: "23-charges-gas-calculator", path: "/admin/charges/gas-calculator" },
  { label: "24-charges-bulk-correct", path: "/admin/charges/bulk-correct" },

  // Giderler
  { label: "25-expense-items", path: "/admin/expense-items" },
  { label: "26-expenses-new", path: "/admin/expenses/new" },
  { label: "27-expenses-report", path: "/admin/expenses/report" },

  // Kurallar
  { label: "28-description-door-rules", path: "/admin/description-door-rules" },
  { label: "29-description-expense-rules", path: "/admin/description-expense-rules" },

  // Ödemeler
  { label: "30-payment-methods", path: "/admin/payment-methods" },
  { label: "31-payments-new", path: "/admin/payments/new" },
  { label: "32-payments-list", path: "/admin/payments/list" },

  // Bakiyeler
  { label: "33-initial-balances", path: "/admin/initial-balances" },

  // Banka
  { label: "34-bank-statement-upload", path: "/admin/bank-statement" },
  { label: "35-banks", path: "/admin/banks" },
  { label: "36-banks-term-deposits", path: "/admin/banks/term-deposits" },
  { label: "37-banks-statement-view", path: "/admin/banks/statement-view" },

  // Bina tanımları
  { label: "38-building-info", path: "/admin/building-info" },
  { label: "39-blocks", path: "/admin/blocks" },
  { label: "40-apartment-classes", path: "/admin/apartment-classes" },
  { label: "41-apartment-types", path: "/admin/apartment-types" },
  { label: "42-apartment-duties", path: "/admin/apartment-duties" },

  // Düzeltmeler & Kapatmalar
  { label: "43-corrections", path: "/admin/corrections" },
  { label: "44-manual-closures", path: "/admin/manual-closures" },
  { label: "45-unclassified", path: "/admin/unclassified" },

  // Ekstre
  { label: "46-statement", path: "/admin/statement" },
  { label: "47-statement-all", path: "/admin/statement/all" },

  // Yükleme & Mutabakat
  { label: "48-upload-batches", path: "/admin/upload-batches" },
  { label: "49-reconcile-door-mismatch", path: "/admin/reconcile/door-mismatch-report" },

  // Diğer
  { label: "50-audit-logs", path: "/admin/audit-logs" },
  { label: "51-guide-manual", path: "/admin/guide/manual" },
  { label: "52-meeting", path: "/admin/meeting" },
  { label: "53-resident-content", path: "/admin/resident-content" },
];

// ── Hata göstergesi selektörleri ─────────────────────────────────────────────
const ERROR_SELECTORS = [
  "text=Something went wrong",
  "text=Uncaught Error",
  "text=Cannot read properties",
  "text=Hata olustu",
  "[data-testid='error-boundary']",
];

// ── Setup: oturum state dosyası ──────────────────────────────────────────────
const AUTH_FILE = path.join(process.cwd(), ".tmp-visual-auth.json");

// ── Giriş yap ve auth state'i diske yaz ──────────────────────────────────────
test.beforeAll(async ({ browser }) => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:5173/login");
  await expect(page.getByRole("heading", { name: /Giri/i })).toBeVisible();

  await page
    .locator('[data-testid="login-identifier"], input[placeholder*="admin@apartman.local"], input[type="text"]')
    .first()
    .fill(ADMIN_ID);
  await page
    .locator('[data-testid="login-password"], input[type="password"]')
    .first()
    .fill(ADMIN_PW);
  await page
    .locator('[data-testid="login-submit"], button:has-text("Giris Yap")')
    .first()
    .click();

  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await page.context().storageState({ path: AUTH_FILE });
  await context.close();
});

// ── Her sayfa bağımsız: hata olsa bile test fail olmaz, sadece uyarı verir ───
for (const { label, path: pagePath } of PAGES) {
  test(`Sayfa: ${label}`, async ({ browser }) => {
    const isLogin = pagePath === "/login";
    const context = isLogin
      ? await browser.newContext({ viewport: { width: 1440, height: 900 } })
      : await browser.newContext({
          storageState: AUTH_FILE,
          viewport: { width: 1440, height: 900 },
        });

    const page = await context.newPage();
    const warnings: string[] = [];

    try {
      const response = await page
        .goto(`http://localhost:5173${pagePath}`, {
          waitUntil: "load",
          timeout: 30_000,
        })
        .catch((err: Error) => { warnings.push(`Navigasyon: ${err.message}`); return null; });

      // React lazy-chunk'larının render olmasını bekle
      await page.waitForTimeout(1500);

      if (response && !response.ok() && response.status() !== 304) {
        warnings.push(`HTTP ${response.status()}`);
      }

      // Lazy-load'ların tamamlanması için bekle — networkidle yerine sabit bekleme kullanıyoruz

      // Hata kontrolü
      for (const sel of ERROR_SELECTORS) {
        const visible = await page.locator(sel).first().isVisible().catch(() => false);
        if (visible) {
          const text = await page.locator(sel).first().textContent().catch(() => sel);
          warnings.push(`Hata elementi: ${text}`);
        }
      }

      // Uyarıları konsola yaz
      for (const w of warnings) {
        console.warn(`⚠️  [${label}] ${w}`);
      }

      // Tam sayfa screenshot — hata olsa bile çek
      const screenshotPath = path.join(SCREENSHOT_DIR, `${label}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const tag = warnings.length > 0 ? "⚠️ " : "📸";
      console.log(`${tag} ${label} → ${screenshotPath}`);
    } finally {
      await context.close();
    }
  });
}

// ── Temizlik ──────────────────────────────────────────────────────────────────
test.afterAll(() => {
  try {
    if (fs.existsSync(AUTH_FILE)) fs.unlinkSync(AUTH_FILE);
  } catch {
    // sessizce geç
  }
  console.log(`\n✅ Tüm screenshots: ${SCREENSHOT_DIR}\n`);
});
