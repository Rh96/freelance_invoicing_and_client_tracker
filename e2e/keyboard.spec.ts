import { expect, test, type Locator, type Page } from "@playwright/test";
import { openDashboard } from "./helpers";

/**
 * The core flow with the keyboard only (T18). Controls are reached by pressing Tab, never
 * by clicking or calling focus(), so a control out of the tab order fails the test.
 */
async function tabTo(page: Page, target: Locator, maxPresses = 40) {
  for (let i = 0; i < maxPresses; i++) {
    const focused = await target
      .evaluate((el) => el === document.activeElement)
      .catch(() => false);
    if (focused) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused(); // fails with Playwright's explanation
}

test("skip link jumps to the page content", async ({ page }) => {
  await openDashboard(page);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("create a client and an invoice, then send it, with the keyboard only", async ({
  page,
}) => {
  await openDashboard(page);
  const main = page.getByRole("main");

  // Main nav. Focus stays on the (still visible) nav link.
  const clientsLink = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Clients" });
  await tabTo(page, clientsLink);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "Clients" }),
  ).toBeVisible();
  await expect(clientsLink).toBeFocused();

  // An in-page link: the old page is hidden, so focus moves to the new content (RouteFocus).
  await tabTo(page, page.getByRole("link", { name: "New client" }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "New client" }),
  ).toBeVisible();
  await expect(main).toBeFocused();
  await page.keyboard.press("Tab");
  const name = page.getByRole("textbox", { name: "Name" });
  await expect(name).toBeFocused();

  // Submitting empty moves focus to the first invalid field.
  await page.keyboard.press("Enter");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toBeFocused();
  await page.keyboard.type("Fern & Co");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "Email" })).toBeFocused();
  await page.keyboard.type("billing@fern.example");
  await tabTo(page, page.getByRole("button", { name: "Add client" }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "Fern & Co" }),
  ).toBeVisible();
  await expect(main).toBeFocused();

  // New invoice, client preselected.
  await tabTo(page, page.getByRole("link", { name: "New invoice" }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "New invoice" }),
  ).toBeVisible();
  await expect(main).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Client" })).toHaveValue(
    /.+/,
  );

  const line1 = page.getByRole("group", { name: "Line 1" });
  await tabTo(page, line1.getByRole("textbox", { name: "Description" }));
  await page.keyboard.type("Landing page");
  await page.keyboard.press("Tab");
  await expect(
    line1.getByRole("spinbutton", { name: "Quantity" }),
  ).toBeFocused();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("2");
  await page.keyboard.press("Tab");
  await expect(
    line1.getByRole("spinbutton", { name: "Unit price ($)" }),
  ).toBeFocused();
  await page.keyboard.type("450");

  // Adding a line focuses its description; removing it returns focus to "Add line item".
  const addLine = page.getByRole("button", { name: "Add line item" });
  await tabTo(page, addLine);
  await page.keyboard.press("Space");
  const line2 = page.getByRole("group", { name: "Line 2" });
  await expect(
    line2.getByRole("textbox", { name: "Description" }),
  ).toBeFocused();
  await tabTo(page, page.getByRole("button", { name: "Remove line 2" }));
  await page.keyboard.press("Enter");
  await expect(line2).toHaveCount(0);
  await expect(addLine).toBeFocused();

  await expect(page.getByText("$974.25")).toBeVisible();
  await tabTo(page, page.getByRole("button", { name: "Save draft" }));
  await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", { level: 1, name: "INV-0009" });
  await expect(heading).toBeVisible();
  await expect(main).toBeFocused();

  // Confirm dialog: Escape cancels and returns focus to the trigger.
  const markSent = page.getByRole("button", { name: "Mark as sent" });
  await tabTo(page, markSent);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(markSent).toBeFocused();

  // Confirming: Tab stays inside the dialog; focus then goes to the heading, because the
  // clicked button is replaced by the next action.
  await page.keyboard.press("Enter");
  await tabTo(
    page,
    dialog.getByRole("button", { name: "Mark as sent" }),
    3, // Cancel → confirm: the dialog traps focus
  );
  await page.keyboard.press("Enter");
  await expect(heading).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Mark as paid" }),
  ).toBeEnabled();
});

test("status filter: arrow keys move between options, with a visible focus ring", async ({
  page,
}) => {
  await page.goto("/invoices");
  const all = page.getByRole("radio", { name: /^All/ });
  await tabTo(page, all);
  await page.keyboard.press("ArrowRight");
  const draft = page.getByRole("radio", { name: /^Draft/ });
  await expect(draft).toBeFocused();
  await expect(draft).toBeChecked();

  // The radio itself is visually hidden; its label must show the focus ring.
  const outline = await page
    .locator("label", { hasText: /^Draft/ })
    .evaluate((label) => getComputedStyle(label).outlineStyle);
  expect(outline).not.toBe("none");
});
