import { expect, test } from "@playwright/test";
import { confirmAction } from "./helpers";

test("a failed Mark as paid rolls back and explains (simulated errors)", async ({
  page,
}) => {
  // `writes`: reads work, every save fails. Remembered for the tab.
  await page.goto("/invoices?simulateErrors=writes");
  // The radios are visually hidden (styled labels); a mouse user clicks the label.
  await page.locator("label", { hasText: /^Sent/ }).click();
  await expect(page.getByRole("radio", { name: /^Sent/ })).toBeChecked();
  const firstSent = page
    .getByRole("table", { name: "Invoices" })
    .getByRole("link")
    .first();
  const number = (await firstSent.textContent()) ?? "";
  await firstSent.click();
  await expect(
    page.getByRole("heading", { level: 1, name: number }),
  ).toBeVisible();

  await confirmAction(page, "Mark as paid");

  // Next.js also renders a role="alert" route announcer, so pick ours by its text.
  await expect(
    page.getByRole("alert").filter({ hasText: "Couldn't mark" }),
  ).toHaveText(
    new RegExp(`Couldn't mark ${number} as paid\\. It's back to Sent\\.`),
  );
  await expect(
    page.getByRole("button", { name: "Mark as paid" }),
  ).toBeEnabled();
  // Next 16 keeps the previous page (the list) mounted but hidden, so match visible text only.
  await expect(
    page.getByText("Sent", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
});
