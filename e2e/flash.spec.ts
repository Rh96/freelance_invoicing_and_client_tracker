import { expect, test } from "@playwright/test";

// Next 16 keeps recent pages mounted but hidden; saving an edit returns to the
// (preserved) detail page, which must still show the confirmation.
test("editing a client returns to its page with a confirmation", async ({
  page,
}) => {
  await page.goto("/clients");
  await page.getByRole("link", { name: "Maya Chen", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Maya Chen" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Company" })
    .fill("Northwind Studio LLC");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Maya Chen" }),
  ).toBeVisible();
  await expect(
    page.getByText("Northwind Studio LLC").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Maya Chen updated.").filter({ visible: true }),
  ).toBeVisible();
});
