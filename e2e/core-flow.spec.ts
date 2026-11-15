import { expect, test } from "@playwright/test";
import {
  cardAmount,
  confirmAction,
  formatUsd,
  openDashboard,
  parseCents,
} from "./helpers";

test("create a client and an invoice, send it, get paid: the dashboard updates", async ({
  page,
}) => {
  await openDashboard(page);
  const paidBefore = parseCents(await cardAmount(page, "Paid").textContent());

  // Client
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Clients" })
    .click();
  await page.getByRole("link", { name: "New client" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Fern & Co");
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("billing@fern.example");
  await page
    .getByRole("textbox", { name: "Address" })
    .fill("9 Garden Row\nAustin, TX 78701");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Fern & Co" }),
  ).toBeVisible();
  await expect(page.getByText("Fern & Co added.")).toBeVisible();

  // Invoice (client preselected from the client page)
  await page.getByRole("link", { name: "New invoice" }).click();
  await expect(page.getByRole("combobox", { name: "Client" })).toHaveValue(
    /.+/,
  );
  const line = page.getByRole("group", { name: "Line 1" });
  await line.getByRole("textbox", { name: "Description" }).fill("Landing page");
  await line.getByRole("spinbutton", { name: "Quantity" }).fill("2");
  await line.getByRole("spinbutton", { name: "Unit price ($)" }).fill("450");
  // $900.00 + 8.25% tax ($74.25)
  await expect(page.getByText("$974.25")).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "INV-0009" }),
  ).toBeVisible();

  // Sent, then paid (each waits for the previous save; see invoice-status-actions)
  await confirmAction(page, "Mark as sent");
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await confirmAction(page, "Mark as paid");
  await expect(
    page.getByRole("button", { name: "Mark as unpaid" }),
  ).toBeEnabled();

  // Dashboard
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Dashboard" })
    .click();
  await expect(cardAmount(page, "Paid")).toHaveText(
    formatUsd(paidBefore + 97425),
  );
  const activity = page
    .getByRole("heading", { name: "Recent activity" })
    .locator("xpath=..");
  await expect(activity.getByRole("listitem").first()).toContainText(
    "INV-0009 paid by Fern & Co",
  );
});
