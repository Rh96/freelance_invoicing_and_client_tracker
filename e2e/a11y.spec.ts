import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { confirmAction, demoIds, openDashboard } from "./helpers";

/**
 * axe scans of every route and of the states a plain page load doesn't show (ADR-017).
 * Serious and critical violations fail; moderate and minor are attached to the test as
 * annotations and printed, so they stay visible without blocking CI.
 */
const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const BLOCKING = new Set(["serious", "critical"]);

async function scan(page: Page) {
  // Wait out the loading skeletons; scanning a skeleton says nothing about the screen.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_AA)
    .analyze();
  // e.g. "serious: color-contrast at span.badge: Element has insufficient color contrast of 4.1 (...)"
  const describe = (v: (typeof violations)[number]) =>
    `${v.impact}: ${v.id} at ${v.nodes
      .map(
        (n) =>
          `${n.target.join(" ")}: ${n.any[0]?.message ?? n.failureSummary}`,
      )
      .join("; ")}`;

  const reported = violations.filter((v) => !BLOCKING.has(v.impact ?? ""));
  for (const v of reported) {
    test.info().annotations.push({ type: "a11y", description: describe(v) });
    console.log(`[a11y] ${test.info().title}: ${describe(v)}`);
  }
  expect(
    violations.filter((v) => BLOCKING.has(v.impact ?? "")).map(describe),
  ).toEqual([]);
}

async function emptyData(page: Page) {
  await page.goto("/clients/new"); // any page: gives localStorage an origin
  await page.evaluate(() =>
    localStorage.setItem(
      "invoice-tracker",
      JSON.stringify({
        version: 1,
        clients: [],
        invoices: [],
        nextInvoiceSeq: 1,
      }),
    ),
  );
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} OS theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme });
    });

    test.describe("routes", () => {
      const routes: [
        string,
        (ids: Awaited<ReturnType<typeof demoIds>>) => string,
        /** Expected <h1> text, where the screen's heading is the message itself. */
        heading?: string,
      ][] = [
        ["dashboard", () => "/"],
        ["clients", () => "/clients"],
        ["new client", () => "/clients/new"],
        ["client detail", (ids) => `/clients/${ids.client}`],
        ["edit client", (ids) => `/clients/${ids.client}/edit`],
        ["invoices", () => "/invoices"],
        ["new invoice", () => "/invoices/new"],
        ["invoice detail (draft)", (ids) => `/invoices/${ids.draft}`],
        ["invoice detail (overdue)", (ids) => `/invoices/${ids.overdue}`],
        ["edit invoice", (ids) => `/invoices/${ids.draft}/edit`],
        ["print invoice", (ids) => `/invoices/${ids.overdue}/print`],
        ["unknown page", () => "/no-such-page"],
        [
          "unknown client",
          () => "/clients/missing",
          "This client doesn't exist.",
        ],
        [
          "unknown invoice",
          () => "/invoices/missing",
          "This invoice doesn't exist.",
        ],
        [
          "unknown invoice (print)",
          () => "/invoices/missing/print",
          "This invoice doesn't exist.",
        ],
      ];
      for (const [name, path, heading] of routes) {
        test(name, async ({ page }) => {
          await openDashboard(page); // seeds demo data
          await page.goto(path(await demoIds(page)));
          // Every screen, including not-found, names itself with a top-level heading.
          const h1 = page.getByRole("heading", { level: 1 });
          await expect(h1).toBeVisible();
          if (heading) await expect(h1).toHaveText(heading);
          await scan(page);
        });
      }
    });

    test.describe("states", () => {
      test("empty dashboard, clients and invoices", async ({ page }) => {
        await emptyData(page);
        for (const path of ["/", "/clients", "/invoices"]) {
          await page.goto(path);
          await expect(
            page.getByText(/^No (clients|invoices) yet/),
          ).toBeVisible();
          await scan(page);
        }
      });

      test("no search results", async ({ page }) => {
        await openDashboard(page);
        await page.goto("/clients");
        await page
          .getByRole("searchbox", { name: "Search clients" })
          .fill("zzz-no-match");
        await expect(page.getByText(/No clients match/)).toBeVisible();
        await scan(page);
      });

      test("load errors", async ({ page }) => {
        await openDashboard(page);
        const ids = await demoIds(page);
        // [path, <h1>]: detail and print screens have no heading of their own until loaded,
        // so the error message is the heading.
        for (const [path, heading] of [
          ["/", "Dashboard"],
          ["/clients", "Clients"],
          ["/invoices", "Invoices"],
          [`/clients/${ids.client}`, "Couldn't load this client."],
          [`/invoices/${ids.draft}`, "Couldn't load this invoice."],
          [`/clients/${ids.client}/edit`, "Edit client"],
          ["/invoices/new", "New invoice"],
          [`/invoices/${ids.draft}/edit`, "Edit invoice"],
          [`/invoices/${ids.draft}/print`, "Couldn't load this invoice."],
        ] as const) {
          // On every URL: the tab only remembers the mode once the page has hydrated.
          await page.goto(`${path}?simulateErrors=all`);
          await expect(
            page
              .getByRole("alert")
              .filter({ hasText: /Couldn.t load/ })
              .first(),
          ).toBeVisible();
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(
            heading,
          );
          await scan(page);
        }
      });

      test("client form with validation errors", async ({ page }) => {
        await page.goto("/clients/new");
        await page.getByRole("button", { name: "Add client" }).click();
        await expect(
          page.locator('[aria-invalid="true"]').first(),
        ).toBeVisible();
        await scan(page);
      });

      test("invoice form with validation errors", async ({ page }) => {
        await openDashboard(page);
        await page.goto("/invoices/new");
        await page
          .getByRole("group", { name: "Line 1" })
          .getByRole("spinbutton", { name: "Unit price ($)" })
          .fill("-5");
        await page.getByRole("button", { name: "Save draft" }).click();
        await expect(
          page.locator('[aria-invalid="true"]').first(),
        ).toBeVisible();
        await scan(page);
      });

      test("confirm dialog open", async ({ page }) => {
        await openDashboard(page);
        await page.goto(`/invoices/${(await demoIds(page)).draft}`);
        await page.getByRole("button", { name: "Mark as sent" }).click();
        await expect(page.getByRole("alertdialog")).toBeVisible();
        await scan(page);
      });

      test("failed save, rolled back", async ({ page }) => {
        await openDashboard(page);
        const { overdue } = await demoIds(page);
        await page.goto(`/invoices/${overdue}?simulateErrors=writes`);
        await confirmAction(page, "Mark as paid");
        await expect(
          page.getByRole("alert").filter({ hasText: "Couldn't mark" }),
        ).toBeVisible();
        await scan(page);
      });

      test("saved message", async ({ page }) => {
        await openDashboard(page);
        await page.goto(`/clients/${(await demoIds(page)).client}/edit`);
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByText(/ updated\.$/)).toBeVisible();
        await scan(page);
      });
    });
  });
}
