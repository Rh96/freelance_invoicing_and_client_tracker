import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_STORAGE_KEY } from "@/data/local-storage-repository";
import type { Repository } from "@/data/repository";
import { addDays } from "@/domain/dates";
import { toIsoDate } from "@/domain/invoice-status";
import { useInvoiceFilters } from "@/stores/invoice-filters";
import {
  memoryStorage,
  renderWithProviders,
  testRepository,
} from "@/test/render-with-providers";
import { InvoiceList } from "./invoice-list";

const today = toIsoDate(new Date());
const line = [{ description: "Work", quantity: 1, unitPriceCents: 50000 }];

/** INV-0001 paid (Maya), INV-0002 overdue (Omar, archived), INV-0003 sent (Maya), INV-0004 draft (Maya). */
async function seed(repository: Repository = testRepository()) {
  const maya = await repository.createClient({
    name: "Maya Chen",
    email: "maya@n.example",
  });
  const omar = await repository.createClient({
    name: "Omar Haddad",
    email: "omar@b.example",
  });
  const make = (clientId: string, dueIn: number) =>
    repository.createInvoice({
      clientId,
      issueDate: addDays(today, -40),
      dueDate: addDays(today, dueIn),
      taxRateBps: 0,
      lineItems: line,
    });
  const paid = await make(maya.id, -10);
  await repository.setInvoiceStatus(paid.id, "sent");
  await repository.setInvoiceStatus(paid.id, "paid");
  const overdue = await make(omar.id, -5);
  await repository.setInvoiceStatus(overdue.id, "sent");
  const sent = await make(maya.id, 10);
  await repository.setInvoiceStatus(sent.id, "sent");
  await make(maya.id, 30); // draft
  await repository.archiveClient(omar.id);
  return repository;
}

const numbers = () =>
  within(screen.getByRole("table", { name: "Invoices" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);

beforeEach(() => {
  useInvoiceFilters.setState({ status: "all" });
});

describe("InvoiceList", () => {
  it("lists every invoice newest first with client, total and derived status", async () => {
    renderWithProviders(<InvoiceList />, { repository: await seed() });

    expect(
      await screen.findByRole("table", { name: "Invoices" }),
    ).toBeInTheDocument();
    expect(numbers()).toEqual(["INV-0004", "INV-0003", "INV-0002", "INV-0001"]);
    const overdueRow = screen.getByRole("row", { name: /INV-0002/ });
    expect(within(overdueRow).getByText("Overdue")).toBeInTheDocument();
    expect(within(overdueRow).getByText("$500.00")).toBeInTheDocument();
    // Archived clients still show by name, linked to their page.
    expect(
      within(overdueRow).getByRole("link", { name: "Omar Haddad" }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/clients\/[^/]+$/));
  });

  it("links each number to its invoice page", async () => {
    renderWithProviders(<InvoiceList />, { repository: await seed() });
    expect(
      await screen.findByRole("link", { name: "INV-0002" }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/invoices\/[^/]+$/));
  });

  it("shows counts per status and filters by the chosen one", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceList />, { repository: await seed() });

    const group = await screen.findByRole("group", {
      name: "Filter by status",
    });
    expect(within(group).getByRole("radio", { name: "All (4)" })).toBeChecked();
    expect(
      within(group).getByRole("radio", { name: "Overdue (1)" }),
    ).toBeInTheDocument();

    await user.click(within(group).getByRole("radio", { name: "Sent (1)" }));
    expect(numbers()).toEqual(["INV-0003"]); // overdue INV-0002 is not "sent"
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 1 of 4 invoices",
    );
  });

  it("can be operated with the keyboard (arrow keys move between statuses)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceList />, { repository: await seed() });
    const all = await screen.findByRole("radio", { name: "All (4)" });

    all.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Draft (1)" })).toBeChecked();
    expect(numbers()).toEqual(["INV-0004"]);
  });

  it("explains an empty filter and offers Show all", async () => {
    const user = userEvent.setup();
    const repository = testRepository();
    const maya = await repository.createClient({
      name: "Maya Chen",
      email: "maya@n.example",
    });
    await repository.createInvoice({
      clientId: maya.id,
      issueDate: today,
      dueDate: today,
      taxRateBps: 0,
      lineItems: line,
    });
    renderWithProviders(<InvoiceList />, { repository });

    await user.click(await screen.findByRole("radio", { name: "Overdue (0)" }));
    expect(screen.getByText("No overdue invoices.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getByRole("radio", { name: "All (1)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "All (1)" })).toHaveFocus();
    expect(numbers()).toEqual(["INV-0001"]);
  });

  it("keeps the chosen filter when shown again", async () => {
    const user = userEvent.setup();
    const repository = await seed();
    const first = renderWithProviders(<InvoiceList />, { repository });
    await user.click(await screen.findByRole("radio", { name: "Paid (1)" }));
    first.unmount();

    renderWithProviders(<InvoiceList />, { repository });
    expect(
      await screen.findByRole("radio", { name: "Paid (1)" }),
    ).toBeChecked();
    expect(numbers()).toEqual(["INV-0001"]);
  });

  it("shows loading, then an empty state when there are no invoices", async () => {
    renderWithProviders(<InvoiceList />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading invoices…");
    expect(await screen.findByText("No invoices yet.")).toBeInTheDocument();
  });

  it("shows an error with Retry, and recovers", async () => {
    const user = userEvent.setup();
    let failing = true;
    const repository = await seed(
      testRepository({ shouldFail: (op) => failing && op === "listInvoices" }),
    );
    renderWithProviders(<InvoiceList />, { repository });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load invoices.",
    );
    failing = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(numbers()).toHaveLength(4);
  });

  it("points to Reset demo data when stored data is corrupt", async () => {
    const storage = memoryStorage();
    storage.data.set(DEFAULT_STORAGE_KEY, "{not json");
    renderWithProviders(<InvoiceList />, {
      repository: testRepository({ storage }),
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Reset demo data",
    );
  });
});
