import { expect, test, type Page } from "@playwright/test";
import { demoIds, openDashboard } from "../e2e/helpers";

/** Regenerates the README images from the demo data (fictional; dates relative to today). */
const OUT = ".github/screenshots";

async function settle(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test.describe("desktop, light", () => {
  test.use({
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });

  test("dashboard, invoice form, invoice detail", async ({ page }) => {
    await openDashboard(page);
    const ids = await demoIds(page);
    await settle(page);
    await page.screenshot({ path: `${OUT}/dashboard.png` });

    await page.goto(`/invoices/${ids.draft}/edit`);
    await settle(page);
    await page.screenshot({ path: `${OUT}/invoice-form.png` });

    await page.goto(`/invoices/${ids.overdue}`);
    await settle(page);
    await page.screenshot({ path: `${OUT}/invoice-detail.png` });
  });
});

test.describe("print, one Letter page", () => {
  // Letter at 96 dpi. Screenshots ignore @page, so its 14 mm margin is added as padding.
  test.use({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2 });

  test("print view", async ({ page }) => {
    await openDashboard(page);
    const { overdue } = await demoIds(page);
    await page.goto(`/invoices/${overdue}/print`);
    await settle(page);
    await page.emulateMedia({ media: "print" });
    await page.addStyleTag({ content: "body { padding: 14mm; }" });
    await page.screenshot({ path: `${OUT}/print.png` });
  });
});

test.describe("phone, dark", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });

  test("dashboard", async ({ page }) => {
    await openDashboard(page);
    await settle(page);
    await page.screenshot({ path: `${OUT}/dashboard-phone-dark.png` });
  });
});
