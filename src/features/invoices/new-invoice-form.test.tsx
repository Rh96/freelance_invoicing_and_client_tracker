import { screen, within } from "@testing-library/react";
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
import { NewInvoiceForm } from "./new-invoice-form";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

async function seed(repository: Repository = testRepository()) {
  const maya = await repository.createClient({
    name: "Maya Chen",
    email: "maya@n.example",
  });
  const ana = await repository.createClient({
    name: "Ana Costa",
    email: "ana@p.example",
  });
  await repository.archiveClient(ana.id);
  return { repository, maya, ana };
}

beforeEach(() => {
  router.push.mockReset();
  useFlash.setState({ message: null });
});

describe("NewInvoiceForm", () => {
  it("defaults to today, Net 30 and 8.25% tax, and hides archived clients", async () => {
    const { repository } = await seed();
    renderWithProviders(<NewInvoiceForm />, { repository });

    const today = toIsoDate(new Date());
    expect(await screen.findByLabelText(/Issue date/)).toHaveValue(today);
    expect(screen.getByLabelText(/Due date/)).toHaveValue(addDays(today, 30));
    expect(
      screen.getByRole("spinbutton", { name: "Tax rate (%)" }),
    ).toHaveValue(8.25);
    const options = within(
      screen.getByRole("combobox", { name: "Client" }),
    ).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Choose a client…",
      "Maya Chen",
    ]);
  });

  it("preselects the client from ?clientId=, but not an archived one", async () => {
    const { repository, maya, ana } = await seed();
    const view = renderWithProviders(
      <NewInvoiceForm initialClientId={maya.id} />,
      { repository },
    );
    expect(await screen.findByRole("combobox", { name: "Client" })).toHaveValue(
      maya.id,
    );
    view.unmount();

    renderWithProviders(<NewInvoiceForm initialClientId={ana.id} />, {
      repository,
    });
    expect(await screen.findByRole("combobox", { name: "Client" })).toHaveValue(
      "",
    );
  });

  it("saves a draft, leaves a message and opens the invoice page", async () => {
    const user = userEvent.setup();
    const { repository, maya } = await seed();
    renderWithProviders(<NewInvoiceForm initialClientId={maya.id} />, {
      repository,
    });

    const group = await screen.findByRole("group", { name: "Line 1" });
    await user.type(
      within(group).getByRole("textbox", { name: "Description" }),
      "Design",
    );
    await user.type(
      within(group).getByRole("spinbutton", { name: "Unit price ($)" }),
      "1200",
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await vi.waitFor(() => expect(router.push).toHaveBeenCalled());
    const [invoice] = await repository.listInvoices();
    expect(router.push).toHaveBeenCalledWith(`/invoices/${invoice?.id}`);
    expect(useFlash.getState().message).toBe("INV-0001 saved as draft.");
    expect(await repository.listInvoices()).toMatchObject([
      {
        number: "INV-0001",
        status: "draft",
        clientId: maya.id,
        taxRateBps: 825,
        lineItems: [
          { description: "Design", quantity: 1, unitPriceCents: 120000 },
        ],
      },
    ]);
  });

  it("asks for a client first when there are no active clients", async () => {
    renderWithProviders(<NewInvoiceForm />);
    expect(
      await screen.findByText("Add a client before creating an invoice."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New client" })).toHaveAttribute(
      "href",
      "/clients/new",
    );
  });
});

describe("NewInvoiceForm right after creating a client", () => {
  it("waits for the refreshed client list so the new client is preselected", async () => {
    const { repository } = await seed();
    const first = renderWithProviders(<NewInvoiceForm />, { repository });
    await screen.findByRole("combobox", { name: "Client" });
    first.unmount();

    // As after "Add client" elsewhere: the cached list is invalidated while nothing shows it,
    // so it stays stale (and lacks the new client) until something refetches it.
    const fern = await repository.createClient({
      name: "Fern & Co",
      email: "f@fern.example",
    });
    await first.queryClient.invalidateQueries({ queryKey: ["clients"] });

    renderWithProviders(<NewInvoiceForm initialClientId={fern.id} />, {
      repository,
      queryClient: first.queryClient,
    });
    expect(await screen.findByRole("combobox", { name: "Client" })).toHaveValue(
      fern.id,
    );
  });
});
