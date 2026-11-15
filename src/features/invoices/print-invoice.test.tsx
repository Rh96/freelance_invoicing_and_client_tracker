import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Repository } from "@/data/repository";
import type { Client } from "@/domain/client";
import type { Invoice } from "@/domain/invoice";
import {
  renderWithProviders,
  testRepository,
} from "@/test/render-with-providers";
import { InvoiceDocument } from "./invoice-document";
import { PrintInvoice } from "./print-invoice";

const client: Client = {
  id: "c1",
  name: "Maya Chen",
  email: "maya@northwind.example",
  company: "Northwind Studio",
  address: "48 Harbor St\nPortland, OR 97204",
  archivedAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "i1",
    number: "INV-0007",
    clientId: "c1",
    status: "sent",
    issueDate: "2026-11-15",
    dueDate: "2026-12-15",
    taxRateBps: 825,
    lineItems: [
      { id: "l1", description: "Design", quantity: 2, unitPriceCents: 1000 },
      { id: "l2", description: "Hosting", quantity: 1, unitPriceCents: 1500 },
    ],
    notes: "Thank you!",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
    sentAt: "2026-11-15T00:00:00.000Z",
    paidAt: null,
    ...overrides,
  };
}

describe("InvoiceDocument", () => {
  it("shows the business, the client to bill, the lines, totals and payment terms", () => {
    render(<InvoiceDocument invoice={invoice()} client={client} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Invoice INV-0007" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Harbor & Pine Studio")).toBeInTheDocument();
    expect(screen.getByText("hello@harborpine.example")).toBeInTheDocument();

    const billTo = screen.getByRole("heading", {
      name: "Bill to",
    }).parentElement!;
    expect(billTo).toHaveTextContent("Maya Chen");
    expect(billTo).toHaveTextContent("Northwind Studio");
    expect(billTo).toHaveTextContent("48 Harbor St");
    expect(billTo).toHaveTextContent("maya@northwind.example");

    const rows = within(screen.getByRole("table", { name: "Line items" }))
      .getAllByRole("row")
      .slice(1);
    expect(
      rows.map((r) =>
        within(r)
          .getAllByRole("cell")
          .map((c) => c.textContent),
      ),
    ).toEqual([
      ["Design", "2", "$10.00", "$20.00"],
      ["Hosting", "1", "$15.00", "$15.00"],
    ]);
    expect(screen.getByText("Total due").nextElementSibling).toHaveTextContent(
      "$37.89",
    );
    expect(screen.getByText(/Please pay by/)).toHaveTextContent(
      "Please pay by Dec 15, 2026.",
    );
    expect(screen.getByText("Thank you!")).toBeInTheDocument();
  });

  it.each([
    ["draft", "Draft"],
    ["paid", "Paid"],
  ] as const)("stamps a %s invoice", (status, stamp) => {
    render(<InvoiceDocument invoice={invoice({ status })} client={client} />);
    expect(screen.getByText(stamp)).toBeInTheDocument();
  });

  it("has no stamp on a sent invoice and handles missing optional details", () => {
    render(
      <InvoiceDocument
        invoice={invoice({ notes: "", lineItems: [] })}
        client={{ ...client, company: "", address: "" }}
      />,
    );
    expect(screen.queryByText("Draft")).toBeNull();
    expect(screen.queryByText("Paid")).toBeNull();
    expect(screen.getByText("No line items.")).toBeInTheDocument();
    expect(screen.getByText("Total due").nextElementSibling).toHaveTextContent(
      "$0.00",
    );
  });
});

describe("PrintInvoice", () => {
  async function seed(repository: Repository = testRepository()) {
    const maya = await repository.createClient({
      name: "Maya Chen",
      email: "maya@n.example",
    });
    return repository
      .createInvoice({
        clientId: maya.id,
        issueDate: "2026-11-15",
        dueDate: "2026-12-15",
        taxRateBps: 0,
        lineItems: [
          { description: "Design", quantity: 1, unitPriceCents: 5000 },
        ],
      })
      .then((inv) => ({ repository, inv }));
  }

  it("renders the document with Back and a Print button that opens the print dialog", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const { repository, inv } = await seed();
    renderWithProviders(<PrintInvoice id={inv.id} />, { repository });

    expect(
      await screen.findByRole("heading", { name: "Invoice INV-0001" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← Back to INV-0001" }),
    ).toHaveAttribute("href", `/invoices/${inv.id}`);
    await user.click(
      screen.getByRole("button", { name: "Print / Save as PDF" }),
    );
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("explains when the invoice doesn't exist", async () => {
    renderWithProviders(<PrintInvoice id="missing" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This invoice doesn't exist.",
    );
  });

  it("offers Retry when the client can't be loaded", async () => {
    const { inv } = await seed();
    const failing = testRepository({ shouldFail: (op) => op === "getClient" });
    const copyClient = await failing.createClient({
      name: "Maya Chen",
      email: "maya@n.example",
    });
    const copy = await failing.createInvoice({
      clientId: copyClient.id,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      taxRateBps: 0,
      lineItems: [],
    });
    renderWithProviders(<PrintInvoice id={copy.id} />, { repository: failing });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load this invoice's client.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
