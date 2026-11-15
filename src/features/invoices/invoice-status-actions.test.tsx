import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { Repository } from "@/data/repository";
import { RepositoryError } from "@/data/repository";
import { RepositoryProvider } from "@/data/repository-context";
import { addDays } from "@/domain/dates";
import type { Invoice } from "@/domain/invoice";
import { toIsoDate } from "@/domain/invoice-status";
import {
  renderWithProviders,
  testRepository,
} from "@/test/render-with-providers";
import { InvoiceDetail } from "./invoice-detail";
import { useSetInvoiceStatus } from "./mutations";
import { invoiceKeys } from "./queries";

const today = toIsoDate(new Date());

/** Real repository whose setInvoiceStatus waits until the test opens (or fails) the gate. */
function gatedRepository(base: Repository) {
  let open!: () => void;
  let fail!: () => void;
  const gate = new Promise<void>((resolve, reject) => {
    open = resolve;
    fail = () =>
      reject(new RepositoryError("simulated_failure", "Simulated failure"));
  });
  const repository: Repository = {
    ...base,
    setInvoiceStatus: async (id, to) => {
      await gate;
      return base.setInvoiceStatus(id, to);
    },
  };
  return { repository, open, fail };
}

async function seed(status: "draft" | "sent" | "paid" | "overdue") {
  const base = testRepository();
  const client = await base.createClient({
    name: "Maya Chen",
    email: "maya@n.example",
  });
  const invoice = await base.createInvoice({
    clientId: client.id,
    issueDate: addDays(today, -40),
    dueDate: addDays(today, status === "overdue" ? -5 : 10),
    taxRateBps: 0,
    lineItems: [{ description: "Work", quantity: 1, unitPriceCents: 10000 }],
  });
  if (status !== "draft") await base.setInvoiceStatus(invoice.id, "sent");
  if (status === "paid") await base.setInvoiceStatus(invoice.id, "paid");
  return { base, invoice };
}

async function confirm(
  user: ReturnType<typeof userEvent.setup>,
  action: string,
) {
  await user.click(await screen.findByRole("button", { name: action }));
  const dialog = screen.getByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name: action }));
}

const heading = () =>
  screen.getByRole("heading", { level: 1, name: "INV-0001" });

describe("invoice status actions", () => {
  it("shows the new status before the save finishes, then announces it", async () => {
    const user = userEvent.setup();
    const { base, invoice } = await seed("sent");
    const { repository, open } = gatedRepository(base);
    renderWithProviders(<InvoiceDetail id={invoice.id} />, { repository });

    await confirm(user, "Mark as paid");

    // Optimistic: the badge says Paid while storage still says sent.
    expect(await screen.findByText("Paid")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect((await base.getInvoice(invoice.id)).status).toBe("sent");
    // The next action waits for this save, so it can't overtake it.
    expect(
      screen.getByRole("button", { name: "Mark as unpaid" }),
    ).toBeDisabled();

    open();
    expect(
      await screen.findByText("INV-0001 marked as paid."),
    ).toBeInTheDocument();
    expect((await base.getInvoice(invoice.id)).status).toBe("paid");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Mark as unpaid" }),
      ).toBeEnabled(),
    );
  });

  it("rolls back and explains when saving fails", async () => {
    const user = userEvent.setup();
    const { base, invoice } = await seed("sent");
    const { repository, fail } = gatedRepository(base);
    renderWithProviders(<InvoiceDetail id={invoice.id} />, { repository });

    await confirm(user, "Mark as paid");
    expect(await screen.findByText("Paid")).toBeInTheDocument();

    fail();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't mark INV-0001 as paid. It's back to Sent.",
    );
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark as paid" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("moves focus to the invoice heading, since the clicked button is replaced", async () => {
    const user = userEvent.setup();
    const { base, invoice } = await seed("sent");
    renderWithProviders(<InvoiceDetail id={invoice.id} />, {
      repository: base,
    });

    await confirm(user, "Mark as paid");
    await waitFor(() => expect(heading()).toHaveFocus());
  });

  it("returns focus to the button when the dialog is cancelled (found in T18)", async () => {
    const user = userEvent.setup();
    const { base, invoice } = await seed("sent");
    renderWithProviders(<InvoiceDetail id={invoice.id} />, {
      repository: base,
    });

    const trigger = await screen.findByRole("button", { name: "Mark as paid" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByText("Sent")).toBeInTheDocument(); // nothing changed
  });

  it("marks a draft as sent and locks editing", async () => {
    const user = userEvent.setup();
    const { base, invoice } = await seed("draft");
    renderWithProviders(<InvoiceDetail id={invoice.id} />, {
      repository: base,
    });

    expect(
      await screen.findByRole("link", { name: "Edit" }),
    ).toBeInTheDocument();
    await confirm(user, "Mark as sent");

    expect(await screen.findByText("Sent")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(
      await screen.findByRole("button", { name: "Mark as paid" }),
    ).toBeInTheDocument();
  });

  it("marks an overdue invoice as paid", async () => {
    const user = userEvent.setup();
    const { base, invoice } = await seed("overdue");
    renderWithProviders(<InvoiceDetail id={invoice.id} />, {
      repository: base,
    });

    expect(await screen.findByText("Overdue")).toBeInTheDocument();
    await confirm(user, "Mark as paid");
    expect(await screen.findByText("Paid")).toBeInTheDocument();
  });

  it("marks a paid invoice as unpaid", async () => {
    const user = userEvent.setup();
    const { base, invoice } = await seed("paid");
    renderWithProviders(<InvoiceDetail id={invoice.id} />, {
      repository: base,
    });

    await confirm(user, "Mark as unpaid");
    expect(
      await screen.findByText("INV-0001 marked as unpaid."),
    ).toBeInTheDocument();
    expect((await base.getInvoice(invoice.id)).paidAt).toBeNull();
  });

  it("does nothing when cancelled", async () => {
    const user = userEvent.setup();
    const { base, invoice } = await seed("sent");
    renderWithProviders(<InvoiceDetail id={invoice.id} />, {
      repository: base,
    });

    await user.click(
      await screen.findByRole("button", { name: "Mark as paid" }),
    );
    expect(
      screen.getByRole("alertdialog", { name: "Mark INV-0001 as paid?" }),
    ).toHaveTextContent("Records today as the payment date.");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect((await base.getInvoice(invoice.id)).status).toBe("sent");
  });
});

describe("useSetInvoiceStatus", () => {
  async function setup(outcome: "open" | "fail") {
    const { base } = await seed("sent");
    const gated = gatedRepository(base);
    const [invoice] = await base.listInvoices();
    if (!invoice) throw new Error("seed failed");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await queryClient.fetchQuery({
      queryKey: invoiceKeys.list(),
      queryFn: () => base.listInvoices(),
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <RepositoryProvider repository={gated.repository}>
          {children}
        </RepositoryProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useSetInvoiceStatus(), { wrapper });
    const listStatus = () =>
      queryClient.getQueryData<Invoice[]>(invoiceKeys.list())?.[0]?.status;
    return { gated, invoice, queryClient, result, listStatus, outcome };
  }

  it("updates the cached list immediately and keeps it after success", async () => {
    const { gated, invoice, queryClient, result, listStatus } =
      await setup("open");
    let done!: Promise<unknown>;
    act(() => {
      done = result.current.mutateAsync({ invoice, to: "paid" });
    });
    await waitFor(() => expect(listStatus()).toBe("paid"));

    gated.open();
    await act(() => done);
    expect(listStatus()).toBe("paid");
    expect(queryClient.getQueryState(invoiceKeys.list())?.isInvalidated).toBe(
      true,
    );
  });

  it("restores the cached list when saving fails", async () => {
    const { gated, invoice, result, listStatus } = await setup("fail");
    let done!: Promise<unknown>;
    act(() => {
      done = result.current
        .mutateAsync({ invoice, to: "paid" })
        .catch(() => undefined);
    });
    await waitFor(() => expect(listStatus()).toBe("paid"));

    gated.fail();
    await act(() => done);
    expect(listStatus()).toBe("sent");
  });
});

describe("useSetInvoiceStatus with a stale invoice object", () => {
  it("uses the cached copy, so a stale status can't produce an impossible change", async () => {
    const { base, invoice: stale } = await seed("sent"); // `stale.status` is still "draft"
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await queryClient.fetchQuery({
      queryKey: invoiceKeys.list(),
      queryFn: () => base.listInvoices(),
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <RepositoryProvider repository={base}>{children}</RepositoryProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useSetInvoiceStatus(), { wrapper });

    await act(() => result.current.mutateAsync({ invoice: stale, to: "paid" }));
    expect((await base.getInvoice(stale.id)).status).toBe("paid");
  });
});
