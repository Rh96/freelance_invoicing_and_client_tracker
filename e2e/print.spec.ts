import { expect, test } from "@playwright/test";
import { openDashboard } from "./helpers";

/** Stores a 15-line invoice for an existing demo client, as T14's "typical invoice". */
async function addFifteenLineInvoice(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const key = "invoice-tracker";
    const store = JSON.parse(localStorage.getItem(key) ?? "null");
    const client = store.clients.find(
      (c: { archivedAt: string | null; address: string }) =>
        c.archivedAt === null && c.address,
    );
    const now = new Date().toISOString();
    store.invoices.push({
      id: "print-check",
      number: "INV-0099",
      clientId: client.id,
      status: "sent",
      issueDate: "2026-11-15",
      dueDate: "2026-12-15",
      taxRateBps: 825,
      lineItems: Array.from({ length: 15 }, (_, i) => ({
        id: `line-${i}`,
        description: `Design and development work, phase ${i + 1} (wireframes, revisions, handoff)`,
        quantity: 1 + (i % 4) * 0.25,
        unitPriceCents: 12500 + i * 500,
      })),
      notes:
        "Net 30. Thank you for your business!\nBank transfer details on request.",
      createdAt: now,
      updatedAt: now,
      sentAt: now,
      paidAt: null,
    });
    localStorage.setItem(key, JSON.stringify(store));
  });
}

function pageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`a 15-line invoice prints on one Letter page (${colorScheme} OS theme)`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await openDashboard(page); // seeds demo data
    await addFifteenLineInvoice(page);

    await page.goto("/invoices/print-check/print");
    await expect(
      page.getByRole("heading", { name: "Invoice INV-0099" }),
    ).toBeVisible();
    await expect(page.getByText("Total due")).toBeVisible();

    const pdf = await page.pdf({ format: "Letter", printBackground: true });
    expect(pageCount(pdf)).toBe(1);
  });
}
