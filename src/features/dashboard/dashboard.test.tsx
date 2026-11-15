import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEFAULT_STORAGE_KEY } from "@/data/local-storage-repository";
import type { Repository } from "@/data/repository";
import { addDays } from "@/domain/dates";
import { toIsoDate } from "@/domain/invoice-status";
import { InvoiceDetail } from "@/features/invoices/invoice-detail";
import {
  memoryStorage,
  renderWithProviders,
  testRepository,
} from "@/test/render-with-providers";
import { Dashboard } from "./dashboard";

const today = toIsoDate(new Date());

/** Paid $400; outstanding: $100 due later, $200 5 days overdue (Omar), $300 12 days overdue (Maya); draft $999. */
async function seed(repository: Repository = testRepository()) {
  const maya = await repository.createClient({
    name: "Maya Chen",
    email: "maya@n.example",
  });
  const omar = await repository.createClient({
    name: "Omar Haddad",
    email: "omar@b.example",
  });
  const make = async (
    clientId: string,
    dueIn: number,
    cents: number,
    status: "draft" | "sent" | "paid",
  ) => {
    const inv = await repository.createInvoice({
      clientId,
      issueDate: addDays(today, -60),
      dueDate: addDays(today, dueIn),
      taxRateBps: 0,
      lineItems: [{ description: "Work", quantity: 1, unitPriceCents: cents }],
    });
    if (status !== "draft") await repository.setInvoiceStatus(inv.id, "sent");
    if (status === "paid") await repository.setInvoiceStatus(inv.id, "paid");
    return inv;
  };
  await make(maya.id, -30, 40_000, "paid");
  await make(maya.id, 10, 10_000, "sent");
  await make(omar.id, -5, 20_000, "sent");
  const mostOverdue = await make(maya.id, -12, 30_000, "sent");
  await make(omar.id, -40, 99_900, "draft");
  return { repository, maya, mostOverdue };
}

const card = (label: string) =>
  screen.getByRole("heading", { level: 3, name: label }).parentElement!;

describe("Dashboard", () => {
  it("shows outstanding vs paid totals (drafts excluded)", async () => {
    renderWithProviders(<Dashboard />, {
      repository: (await seed()).repository,
    });

    expect(
      await screen.findByRole("heading", { level: 3, name: "Outstanding" }),
    ).toBeInTheDocument();
    expect(card("Outstanding")).toHaveTextContent("$600.00");
    expect(card("Outstanding")).toHaveTextContent("3 unpaid invoices");
    expect(card("Paid")).toHaveTextContent("$400.00");
    expect(card("Paid")).toHaveTextContent("1 paid invoice");
  });

  it("lists overdue invoices, most overdue first, with links and days overdue", async () => {
    const { repository, maya, mostOverdue } = await seed();
    renderWithProviders(<Dashboard />, { repository });

    const section = (
      await screen.findByRole("heading", { name: "Overdue" })
    ).closest("section")!;
    expect(section).toHaveTextContent("2 overdue · $500.00");
    const items = within(section).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "INV-0004Maya Chen12 days overdue$300.00",
      "INV-0003Omar Haddad5 days overdue$200.00",
    ]);
    expect(
      within(items[0]!).getByRole("link", { name: "INV-0004" }),
    ).toHaveAttribute("href", `/invoices/${mostOverdue.id}`);
    expect(
      within(items[0]!).getByRole("link", { name: "Maya Chen" }),
    ).toHaveAttribute("href", `/clients/${maya.id}`);
  });

  it("says when nothing is overdue", async () => {
    const repository = testRepository();
    const c = await repository.createClient({
      name: "Jane Doe",
      email: "jane@d.example",
    });
    await repository.createInvoice({
      clientId: c.id,
      issueDate: today,
      dueDate: addDays(today, 30),
      taxRateBps: 0,
      lineItems: [],
    });
    renderWithProviders(<Dashboard />, { repository });
    expect(await screen.findByText("Nothing overdue.")).toBeInTheDocument();
  });

  it("prompts to create the first invoice when there are none", async () => {
    renderWithProviders(<Dashboard />);
    expect(
      await screen.findByRole("link", { name: "Create your first invoice" }),
    ).toHaveAttribute("href", "/invoices/new");
  });

  it("shows loading, then an error with Retry that recovers", async () => {
    const user = userEvent.setup();
    let failing = true;
    const { repository } = await seed(
      testRepository({ shouldFail: (op) => failing && op === "listInvoices" }),
    );
    renderWithProviders(<Dashboard />, { repository });

    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard…");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load the dashboard.",
    );
    failing = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("heading", { level: 3, name: "Outstanding" }),
    ).toBeInTheDocument();
  });

  it("points to Reset demo data when stored data is corrupt", async () => {
    const storage = memoryStorage();
    storage.data.set(DEFAULT_STORAGE_KEY, "{not json");
    renderWithProviders(<Dashboard />, {
      repository: testRepository({ storage }),
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Reset demo data",
    );
  });

  it("updates totals after an invoice is marked paid elsewhere in the app", async () => {
    const user = userEvent.setup();
    const { repository, mostOverdue } = await seed();
    renderWithProviders(
      <>
        <Dashboard />
        <InvoiceDetail id={mostOverdue.id} />
      </>,
      { repository },
    );
    await screen.findByRole("heading", { level: 3, name: "Outstanding" });

    await user.click(
      await screen.findByRole("button", { name: "Mark as paid" }),
    );
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Mark as paid",
      }),
    );

    await waitFor(() => expect(card("Paid")).toHaveTextContent("$700.00"));
    expect(card("Outstanding")).toHaveTextContent("$300.00");
    const section = screen
      .getByRole("heading", { name: "Overdue" })
      .closest("section")!;
    expect(section).toHaveTextContent("1 overdue · $200.00");
  });
});
