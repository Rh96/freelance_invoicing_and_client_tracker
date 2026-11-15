import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Repository } from "@/data/repository";
import { addDays } from "@/domain/dates";
import { toIsoDate } from "@/domain/invoice-status";
import {
  renderWithProviders,
  testRepository,
} from "@/test/render-with-providers";
import { ClientDetail } from "./client-detail";

const today = toIsoDate(new Date());

async function setup(repository: Repository = testRepository()) {
  const maya = await repository.createClient({
    name: "Maya Chen",
    email: "maya@northwind.example",
    company: "Northwind Studio",
    address: "48 Harbor St\nPortland, OR 97204",
  });
  const omar = await repository.createClient({
    name: "Omar Haddad",
    email: "ap@brightline.example",
  });
  const line = [{ description: "Design", quantity: 1, unitPriceCents: 100000 }];
  // Maya: one overdue (sent, due yesterday), one draft. Omar: one invoice that must not appear.
  const overdue = await repository.createInvoice({
    clientId: maya.id,
    issueDate: addDays(today, -30),
    dueDate: addDays(today, -1),
    taxRateBps: 1000,
    lineItems: line,
  });
  await repository.setInvoiceStatus(overdue.id, "sent");
  await repository.createInvoice({
    clientId: maya.id,
    issueDate: today,
    dueDate: addDays(today, 30),
    taxRateBps: 0,
    lineItems: line,
  });
  await repository.createInvoice({
    clientId: omar.id,
    issueDate: today,
    dueDate: today,
    taxRateBps: 0,
    lineItems: line,
  });
  return { repository, maya };
}

describe("ClientDetail", () => {
  it("shows the client's details and only their invoices with derived status", async () => {
    const { repository, maya } = await setup();
    renderWithProviders(<ClientDetail id={maya.id} />, { repository });

    expect(
      await screen.findByRole("heading", { level: 1, name: "Maya Chen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "maya@northwind.example" }),
    ).toHaveAttribute("href", "mailto:maya@northwind.example");
    expect(screen.getByText("Northwind Studio")).toBeInTheDocument();

    const table = await screen.findByRole("table", {
      name: "Invoices for this client",
    });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(
      rows.map((r) => within(r).getAllByRole("cell")[0]?.textContent),
    ).toEqual(["INV-0002", "INV-0001"]);
    expect(within(rows[1]!).getByText("Overdue")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("$1,100.00")).toBeInTheDocument(); // $1,000 + 10% tax
    expect(within(rows[0]!).getByText("Draft")).toBeInTheDocument();
    expect(
      within(rows[0]!).getByRole("link", { name: "INV-0002" }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/invoices\/[^/]+$/));
  });

  it("links to the edit page", async () => {
    const { repository, maya } = await setup();
    renderWithProviders(<ClientDetail id={maya.id} />, { repository });
    expect(await screen.findByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/clients/${maya.id}/edit`,
    );
  });

  it("offers New invoice for this client only while active", async () => {
    const user = userEvent.setup();
    const { repository, maya } = await setup();
    renderWithProviders(<ClientDetail id={maya.id} />, { repository });

    expect(
      await screen.findByRole("link", { name: "New invoice" }),
    ).toHaveAttribute("href", `/invoices/new?clientId=${maya.id}`);
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(screen.getByRole("button", { name: "Archive client" }));
    await screen.findByText(/^Archived on /);
    expect(screen.queryByRole("link", { name: "New invoice" })).toBeNull();
  });

  it("archives after confirmation and shows the archived state", async () => {
    const user = userEvent.setup();
    const { repository, maya } = await setup();
    renderWithProviders(<ClientDetail id={maya.id} />, { repository });

    await user.click(await screen.findByRole("button", { name: "Archive" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "Archive Maya Chen?",
    });
    expect(dialog).toHaveTextContent("Their invoices stay unchanged.");
    await user.click(
      within(dialog).getByRole("button", { name: "Archive client" }),
    );

    expect(await screen.findByText(/^Archived on /)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    expect((await repository.getClient(maya.id)).archivedAt).not.toBeNull();
    // Invoices are untouched.
    expect(
      (await repository.listInvoices()).filter((i) => i.clientId === maya.id),
    ).toHaveLength(2);
  });

  it("does nothing when archiving is cancelled", async () => {
    const user = userEvent.setup();
    const { repository, maya } = await setup();
    renderWithProviders(<ClientDetail id={maya.id} />, { repository });

    await user.click(await screen.findByRole("button", { name: "Archive" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect((await repository.getClient(maya.id)).archivedAt).toBeNull();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  });

  it("keeps the dialog open with an error when archiving fails", async () => {
    const user = userEvent.setup();
    const { repository, maya } = await setup(
      testRepository({ shouldFail: (op) => op === "archiveClient" }),
    );
    renderWithProviders(<ClientDetail id={maya.id} />, { repository });

    await user.click(await screen.findByRole("button", { name: "Archive" }));
    await user.click(screen.getByRole("button", { name: "Archive client" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't archive the client",
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("shows an empty invoices message", async () => {
    const repository = testRepository();
    const jane = await repository.createClient({
      name: "Jane Doe",
      email: "jane@doe.example",
    });
    renderWithProviders(<ClientDetail id={jane.id} />, { repository });
    expect(
      await screen.findByText("No invoices for this client yet."),
    ).toBeInTheDocument();
  });

  it("explains when the client doesn't exist", async () => {
    renderWithProviders(<ClientDetail id="missing" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This client doesn't exist.",
    );
  });

  it("offers Retry when invoices fail to load", async () => {
    const { maya } = await setup();
    const repository = testRepository({
      shouldFail: (op) => op === "listInvoices",
    });
    const copy = await repository.createClient({
      name: maya.name,
      email: maya.email,
    });
    renderWithProviders(<ClientDetail id={copy.id} />, { repository });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load invoices.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
