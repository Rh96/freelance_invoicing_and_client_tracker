import { expect, type Page } from "@playwright/test";

/** "$7,552.68" → 755268 (cents). */
export function parseCents(text: string | null): number {
  const value = Number((text ?? "").replace(/[$,]/g, ""));
  if (!Number.isFinite(value)) throw new Error(`Not a money amount: "${text}"`);
  return Math.round(value * 100);
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Opens the dashboard and waits until the demo seed has loaded. */
export async function openDashboard(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 3, name: "Paid" }),
  ).toBeVisible();
}

/** The big amount on a dashboard card ("Outstanding" or "Paid"). */
export function cardAmount(page: Page, label: "Outstanding" | "Paid") {
  return page
    .getByRole("heading", { level: 3, name: label })
    .locator("xpath=..")
    .locator("p")
    .first();
}

/** Confirms an action whose trigger and dialog button share a label. */
export async function confirmAction(page: Page, label: string) {
  await page.getByRole("button", { name: label }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: label })
    .click();
}

type StoredDemo = {
  clients: { id: string; archivedAt: string | null }[];
  invoices: { id: string; status: string; dueDate: string }[];
};

/** IDs from the seeded demo data (generated at random), for routes that need one. */
export async function demoIds(page: Page) {
  const ids = await page.evaluate(() => {
    const store = JSON.parse(
      localStorage.getItem("invoice-tracker") ?? "null",
    ) as StoredDemo | null;
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
    return {
      client: store?.clients.find((c) => c.archivedAt === null)?.id,
      draft: store?.invoices.find((i) => i.status === "draft")?.id,
      overdue: store?.invoices.find(
        (i) => i.status === "sent" && i.dueDate < today,
      )?.id,
    };
  });
  const { client, draft, overdue } = ids;
  if (!client || !draft || !overdue) throw new Error("Demo data not seeded");
  return { client, draft, overdue };
}
