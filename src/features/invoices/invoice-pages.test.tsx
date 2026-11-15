import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Repository } from "@/data/repository";
import { addDays } from "@/domain/dates";
import { toIsoDate } from "@/domain/invoice-status";
import { useFlash } from "@/stores/flash";
import {
  renderWithProviders,
  testRepository,
} from "@/test/render-with-providers";
import { EditInvoice } from "./edit-invoice";
import { InvoiceDetail } from "./invoice-detail";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const today = toIsoDate(new Date());

async function seed(repository: Repository = testRepository()) {
  const maya = await repository.createClient({
    name: "Maya Chen",
    email: "maya@n.example",
  });
  const invoice = await repository.createInvoice({
    clientId: maya.id,
    issueDate: today,
    dueDate: addDays(today, 30),
    taxRateBps: 825,
    notes: "Net 30.",
    lineItems: [
      { description: "Design", quantity: 2, unitPriceCents: 1000 },
      { description: "Hosting", quantity: 1, unitPriceCents: 1500 },
    ],
  });
  return { repository, maya, invoice };
}

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  useFlash.setState({ message: null });
});

describe("InvoiceDetail", () => {
  it("shows the invoice with its client, lines, totals and notes", async () => {
    const { repository, maya, invoice } = await seed();
    renderWithProviders(<InvoiceDetail id={invoice.id} />, { repository });

    expect(
      await screen.findByRole("heading", { level: 1, name: "INV-0001" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Maya Chen" }),
    ).toHaveAttribute("href", `/clients/${maya.id}`);

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
    expect(screen.getByText("Subtotal").nextElementSibling).toHaveTextContent(
      "$35.00",
    );
    expect(
      screen.getByText("Tax (8.25%)").nextElementSibling,
    ).toHaveTextContent("$2.89");
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent(
      "$37.89",
    );
    expect(screen.getByText("Net 30.")).toBeInTheDocument();
  });

  it("offers Edit only for drafts", async () => {
    const { repository, invoice } = await seed();
    const view = renderWithProviders(<InvoiceDetail id={invoice.id} />, {
      repository,
    });
    expect(await screen.findByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/invoices/${invoice.id}/edit`,
    );
    view.unmount();

    await repository.setInvoiceStatus(invoice.id, "sent");
    renderWithProviders(<InvoiceDetail id={invoice.id} />, { repository });
    await screen.findByRole("heading", { level: 1, name: "INV-0001" });
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
  });

  it("explains when the invoice doesn't exist", async () => {
    renderWithProviders(<InvoiceDetail id="missing" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This invoice doesn't exist.",
    );
  });

  it("offers Retry when loading fails", async () => {
    renderWithProviders(<InvoiceDetail id="any" />, {
      repository: testRepository({ shouldFail: (op) => op === "getInvoice" }),
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load this invoice.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("EditInvoice", () => {
  it("prefills the draft in dollars and percent, saves and opens the invoice page", async () => {
    const user = userEvent.setup();
    const { repository, invoice } = await seed();
    renderWithProviders(<EditInvoice id={invoice.id} />, { repository });

    const line1 = await screen.findByRole("group", { name: "Line 1" });
    expect(
      within(line1).getByRole("spinbutton", { name: "Unit price ($)" }),
    ).toHaveValue(10);
    expect(
      screen.getByRole("spinbutton", { name: "Tax rate (%)" }),
    ).toHaveValue(8.25);

    const price = within(line1).getByRole("spinbutton", {
      name: "Unit price ($)",
    });
    await user.clear(price);
    await user.type(price, "12.5");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(`/invoices/${invoice.id}`),
    );
    expect(useFlash.getState().message).toBe("INV-0001 saved.");
    expect(
      (await repository.getInvoice(invoice.id)).lineItems[0]?.unitPriceCents,
    ).toBe(1250);
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      `/invoices/${invoice.id}`,
    );
  });

  it.each(["sent", "paid"] as const)(
    "redirects a %s invoice to its page with a message",
    async (status) => {
      const { repository, invoice } = await seed();
      await repository.setInvoiceStatus(invoice.id, "sent");
      if (status === "paid")
        await repository.setInvoiceStatus(invoice.id, "paid");
      renderWithProviders(<EditInvoice id={invoice.id} />, { repository });

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith(`/invoices/${invoice.id}`),
      );
      expect(useFlash.getState().message).toBe(
        `INV-0001 is ${status} and can no longer be edited.`,
      );
      expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    },
  );

  it("keeps the current client selectable after it was archived", async () => {
    const { repository, maya, invoice } = await seed();
    await repository.createClient({
      name: "Omar Haddad",
      email: "omar@b.example",
    });
    await repository.archiveClient(maya.id);
    renderWithProviders(<EditInvoice id={invoice.id} />, { repository });

    const select = await screen.findByRole("combobox", { name: "Client" });
    expect(select).toHaveValue(maya.id);
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Choose a client…", "Maya Chen", "Omar Haddad"]);
  });

  it("explains the lock if the invoice was sent while the form was open", async () => {
    const user = userEvent.setup();
    const { repository, invoice } = await seed();
    renderWithProviders(<EditInvoice id={invoice.id} />, { repository });
    await screen.findByRole("button", { name: "Save changes" });

    await repository.setInvoiceStatus(invoice.id, "sent"); // e.g. from another tab
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invoice INV-0001 is sent and can no longer be edited.",
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});
