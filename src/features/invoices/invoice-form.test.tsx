import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "@/data/repository";
import type { Client } from "@/domain/client";
import { InvoiceForm, type InvoiceFormProps } from "./invoice-form";
import { emptyLineItem, type InvoiceFormValues } from "./invoice-form-schema";

function client(id: string, name: string, company = ""): Client {
  return {
    id,
    name,
    email: `${id}@x.example`,
    company,
    address: "",
    archivedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

const CLIENTS = [
  client("c1", "Maya Chen", "Northwind Studio"),
  client("c2", "Omar Haddad"),
];

const DEFAULTS: InvoiceFormValues = {
  clientId: "",
  issueDate: "2026-11-15",
  dueDate: "2026-12-15",
  taxRatePercent: 8.25,
  lineItems: [emptyLineItem()],
  notes: "",
};

function renderForm(props: Partial<InvoiceFormProps> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  render(
    <InvoiceForm
      clients={CLIENTS}
      defaultValues={DEFAULTS}
      submitLabel="Save draft"
      cancelHref="/invoices"
      {...props}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const line = (n: number) => screen.getByRole("group", { name: `Line ${n}` });
const totalsText = () =>
  screen.getByText("Total").nextElementSibling?.textContent;

async function fillLine(
  user: ReturnType<typeof userEvent.setup>,
  n: number,
  desc: string,
  qty: string,
  price: string,
) {
  const group = line(n);
  await user.type(
    within(group).getByRole("textbox", { name: "Description" }),
    desc,
  );
  const quantity = within(group).getByRole("spinbutton", { name: "Quantity" });
  await user.clear(quantity);
  await user.type(quantity, qty);
  await user.type(
    within(group).getByRole("spinbutton", { name: "Unit price ($)" }),
    price,
  );
}

describe("InvoiceForm", () => {
  it("offers the given clients with company names", () => {
    renderForm();
    const select = screen.getByRole("combobox", { name: "Client" });
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual([
      "Choose a client…",
      "Maya Chen (Northwind Studio)",
      "Omar Haddad",
    ]);
  });

  it("updates line and invoice totals live", async () => {
    const { user } = renderForm();
    await fillLine(user, 1, "Design", "2", "10");

    expect(within(line(1)).getByText("$20.00")).toBeInTheDocument();
    expect(screen.getByText("Subtotal").nextElementSibling).toHaveTextContent(
      "$20.00",
    );
    expect(screen.getByText("Tax").nextElementSibling).toHaveTextContent(
      "$1.65",
    );
    expect(totalsText()).toBe("$21.65");

    const tax = screen.getByRole("spinbutton", { name: "Tax rate (%)" });
    await user.clear(tax);
    await user.type(tax, "0");
    expect(totalsText()).toBe("$20.00");
  });

  it("adds a line and focuses it; removing focuses Add line item", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Add line item" }));
    expect(
      within(line(2)).getByRole("textbox", { name: "Description" }),
    ).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Remove line 2" }));
    expect(screen.queryByRole("group", { name: "Line 2" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add line item" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Remove line 1" }));
    expect(screen.getByText(/saved as an empty draft/)).toBeInTheDocument();
    expect(totalsText()).toBe("$0.00");
  });

  it("blocks an invalid submit, shows every error and focuses the first", async () => {
    const { onSubmit, user } = renderForm();
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText("Choose a client")).toBeInTheDocument();
    expect(
      within(line(1)).getByText("Description is required"),
    ).toBeInTheDocument();
    expect(within(line(1)).getByText("Enter a price")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Client" })).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a due date before the issue date even when a price is missing", async () => {
    const { user } = renderForm({
      defaultValues: { ...DEFAULTS, dueDate: "2026-11-01" },
    });
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(
      await screen.findByText("Due date must be on or after the issue date"),
    ).toBeInTheDocument();
    expect(within(line(1)).getByText("Enter a price")).toBeInTheDocument();
  });

  it("keeps the due date at issue + terms until the user changes it", async () => {
    const { user } = renderForm();
    const issue = screen.getByLabelText(/Issue date/);
    const due = screen.getByLabelText(/Due date/);

    await user.clear(issue);
    await user.type(issue, "2026-12-01");
    expect(due).toHaveValue("2026-12-31");

    await user.clear(due);
    await user.type(due, "2027-01-15");
    await user.clear(issue);
    await user.type(issue, "2026-12-10");
    expect(due).toHaveValue("2027-01-15");
  });

  it("submits cents and basis points", async () => {
    const { onSubmit, user } = renderForm();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Client" }),
      "c1",
    );
    await fillLine(user, 1, "Design", "1.5", "0.29");
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "Thanks!");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        clientId: "c1",
        issueDate: "2026-11-15",
        dueDate: "2026-12-15",
        taxRateBps: 825,
        notes: "Thanks!",
        lineItems: [
          { description: "Design", quantity: 1.5, unitPriceCents: 29 },
        ],
      }),
    );
  });

  it("maps the data layer's field errors onto the form", async () => {
    const { user } = renderForm({
      defaultValues: {
        ...DEFAULTS,
        clientId: "c1",
        lineItems: [{ description: "Design", quantity: 1, unitPrice: 10 }],
      },
      onSubmit: vi.fn().mockRejectedValue(
        new RepositoryError("validation", "Some fields are invalid", {
          clientId: ["This client is archived"],
          "lineItems.0.unitPriceCents": ["Price must be in whole cents"],
        }),
      ),
    });
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(
      await screen.findByText("This client is archived"),
    ).toBeInTheDocument();
    expect(
      within(line(1)).getByText("Price must be in whole cents"),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Client" })).toHaveFocus();
  });

  it("keeps the input and shows an error when saving fails", async () => {
    const { user } = renderForm({
      defaultValues: {
        ...DEFAULTS,
        clientId: "c1",
        lineItems: [{ description: "Design", quantity: 1, unitPrice: 10 }],
      },
      onSubmit: vi
        .fn()
        .mockRejectedValue(new RepositoryError("simulated_failure", "nope")),
    });
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't save the invoice",
    );
    expect(
      within(line(1)).getByRole("textbox", { name: "Description" }),
    ).toHaveValue("Design");
  });
});
