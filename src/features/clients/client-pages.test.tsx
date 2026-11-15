import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFlash } from "@/stores/flash";
import {
  renderWithProviders,
  testRepository,
} from "@/test/render-with-providers";
import { EditClient } from "./edit-client";
import { NewClientForm } from "./new-client-form";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  router.push.mockReset();
  useFlash.setState({ message: null });
});

describe("NewClientForm", () => {
  it("creates the client, leaves a message and returns to the list", async () => {
    const user = userEvent.setup();
    const { repository } = renderWithProviders(<NewClientForm />);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Jane Doe");
    await user.type(
      screen.getByRole("textbox", { name: "Email" }),
      "jane@doe.example",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Company" }),
      "Doe Design",
    );
    await user.click(screen.getByRole("button", { name: "Add client" }));

    await vi.waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/clients"),
    );
    expect(useFlash.getState().message).toBe("Jane Doe added.");
    expect(await repository.listClients()).toMatchObject([
      { name: "Jane Doe", email: "jane@doe.example", company: "Doe Design" },
    ]);
  });

  it("stays on the form with an error when saving fails", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewClientForm />, {
      repository: testRepository({ shouldFail: (op) => op === "createClient" }),
    });

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Jane Doe");
    await user.type(
      screen.getByRole("textbox", { name: "Email" }),
      "jane@doe.example",
    );
    await user.click(screen.getByRole("button", { name: "Add client" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't save the client",
    );
    expect(router.push).not.toHaveBeenCalled();
    expect(useFlash.getState().message).toBeNull();
  });
});

describe("EditClient", () => {
  it("loads the client, saves changes and returns to the list", async () => {
    const user = userEvent.setup();
    const repository = testRepository();
    const maya = await repository.createClient({
      name: "Maya Chen",
      email: "maya@northwind.example",
    });
    renderWithProviders(<EditClient id={maya.id} />, { repository });

    expect(screen.getByRole("status")).toHaveTextContent("Loading client…");
    const name = await screen.findByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("Maya Chen");

    await user.clear(name);
    await user.type(name, "Maya Chen-Ross");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/clients"),
    );
    expect(useFlash.getState().message).toBe("Maya Chen-Ross updated.");
    expect((await repository.getClient(maya.id)).name).toBe("Maya Chen-Ross");
  });

  it("explains when the client doesn't exist", async () => {
    renderWithProviders(<EditClient id="missing" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This client doesn't exist.",
    );
    expect(
      screen.getByRole("link", { name: "Back to clients" }),
    ).toHaveAttribute("href", "/clients");
  });

  it("offers Retry when loading fails", async () => {
    renderWithProviders(<EditClient id="any" />, {
      repository: testRepository({ shouldFail: (op) => op === "getClient" }),
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load this client.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
