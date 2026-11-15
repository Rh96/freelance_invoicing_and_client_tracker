import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_STORAGE_KEY } from "@/data/local-storage-repository";
import type { Repository } from "@/data/repository";
import { useClientFilters } from "@/stores/client-filters";
import {
  memoryStorage,
  renderWithProviders,
  testRepository,
} from "@/test/render-with-providers";
import { ClientList } from "./client-list";

async function seedClients(repository: Repository) {
  await repository.createClient({
    name: "Omar Haddad",
    email: "ap@brightline.example",
    company: "Brightline Labs",
  });
  await repository.createClient({
    name: "Maya Chen",
    email: "maya@northwind.example",
    company: "Northwind Studio",
  });
  await repository.createClient({
    name: "Liam Walsh",
    email: "liam@kestrel.example",
  });
  const ana = await repository.createClient({
    name: "Ana Costa",
    email: "hello@oldpier.example",
    company: "Old Pier Bakery",
  });
  await repository.archiveClient(ana.id);
  return repository;
}

function rowNames() {
  return screen
    .getAllByRole("row")
    .slice(1) // header row
    .map((row) => row.querySelector("td")?.textContent);
}

beforeEach(() => {
  useClientFilters.setState({ search: "" });
});

describe("ClientList", () => {
  it("shows a loading state, then active clients sorted by name", async () => {
    const repository = await seedClients(testRepository());
    const slow = {
      ...repository,
      listClients: async () => {
        await new Promise((r) => setTimeout(r, 30));
        return repository.listClients();
      },
    };
    renderWithProviders(<ClientList />, { repository: slow });

    expect(screen.getByRole("status")).toHaveTextContent("Loading clients…");
    expect(
      await screen.findByRole("table", { name: "Clients" }),
    ).toBeInTheDocument();
    expect(rowNames()).toEqual(["Liam Walsh", "Maya Chen", "Omar Haddad"]);
    expect(screen.queryByText("Ana Costa")).toBeNull(); // archived
    expect(screen.getByRole("status")).toHaveTextContent("3 clients");
  });

  it("filters by name, company or email as you type and announces the count", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientList />, {
      repository: await seedClients(testRepository()),
    });
    const search = await screen.findByRole("searchbox", {
      name: "Search clients",
    });

    await user.type(search, "NORTHWIND");
    expect(rowNames()).toEqual(["Maya Chen"]);
    expect(screen.getByRole("status")).toHaveTextContent("1 of 3 clients");

    await user.clear(search);
    await user.type(search, "brightline.example");
    expect(rowNames()).toEqual(["Omar Haddad"]);
  });

  it("shows no-results with a Clear search that restores the list and focus", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientList />, {
      repository: await seedClients(testRepository()),
    });
    const search = await screen.findByRole("searchbox", {
      name: "Search clients",
    });

    await user.type(search, "zzz");
    expect(screen.getByText("No clients match “zzz”.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(rowNames()).toHaveLength(3);
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
  });

  it("keeps the search when the list is shown again (Zustand store)", async () => {
    const user = userEvent.setup();
    const repository = await seedClients(testRepository());
    const first = renderWithProviders(<ClientList />, { repository });
    await user.type(await screen.findByRole("searchbox"), "maya");
    first.unmount();

    renderWithProviders(<ClientList />, { repository });
    expect(await screen.findByRole("searchbox")).toHaveValue("maya");
    expect(rowNames()).toEqual(["Maya Chen"]);
  });

  it("shows an empty state when there are no clients", async () => {
    renderWithProviders(<ClientList />);
    expect(await screen.findByText("No clients yet.")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("shows an error with Retry, and recovers", async () => {
    const user = userEvent.setup();
    let failing = true;
    const repository = await seedClients(
      testRepository({ shouldFail: (op) => failing && op === "listClients" }),
    );
    renderWithProviders(<ClientList />, { repository });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load clients.",
    );
    failing = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(rowNames()).toHaveLength(3);
  });

  it("points to Reset demo data when stored data is corrupt", async () => {
    const storage = memoryStorage();
    storage.data.set(DEFAULT_STORAGE_KEY, "{not json");
    renderWithProviders(<ClientList />, {
      repository: testRepository({ storage }),
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Reset demo data",
    );
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});
