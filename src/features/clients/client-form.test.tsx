import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "@/data/repository";
import { ClientForm, type ClientFormProps } from "./client-form";

function renderForm(props: Partial<ClientFormProps> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  render(
    <ClientForm
      submitLabel="Add client"
      cancelHref="/clients"
      {...props}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const nameInput = () => screen.getByRole("textbox", { name: "Name" });
const emailInput = () => screen.getByRole("textbox", { name: "Email" });

function errorTextFor(input: HTMLElement) {
  const ids = input.getAttribute("aria-describedby")?.split(" ") ?? [];
  return ids.map((id) => document.getElementById(id)?.textContent).join(" ");
}

describe("ClientForm", () => {
  it("labels every field and marks the required ones", () => {
    renderForm();
    expect(nameInput()).toHaveAttribute("aria-required", "true");
    expect(emailInput()).toHaveAttribute("aria-required", "true");
    expect(
      screen.getByRole("textbox", { name: "Company" }),
    ).not.toHaveAttribute("aria-required");
    expect(
      screen.getByRole("textbox", { name: "Address" }),
    ).toHaveAccessibleDescription("Shown under “Bill to” on printed invoices.");
  });

  it("blocks an invalid submit, links errors to fields and focuses the first one", async () => {
    const { onSubmit, user } = renderForm();
    await user.type(emailInput(), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Add client" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
    expect(errorTextFor(nameInput())).toContain("Name is required");
    expect(errorTextFor(emailInput())).toContain("Enter a valid email address");
    expect(nameInput()).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("validates a field when you leave it, and clears the error once fixed", async () => {
    const { user } = renderForm();
    await user.type(emailInput(), "jane@");
    await user.tab();
    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeInTheDocument();

    await user.type(emailInput(), "doe.example");
    await waitFor(() =>
      expect(screen.queryByText("Enter a valid email address")).toBeNull(),
    );
    expect(emailInput()).toHaveAttribute("aria-invalid", "false");
  });

  it("submits trimmed values", async () => {
    const { onSubmit, user } = renderForm();
    await user.type(nameInput(), "  Jane Doe ");
    await user.type(emailInput(), "jane@doe.example");
    await user.click(screen.getByRole("button", { name: "Add client" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Jane Doe",
        email: "jane@doe.example",
        company: "",
        address: "",
      }),
    );
  });

  it("shows a pending state while saving", async () => {
    let finish!: () => void;
    const { user } = renderForm({
      onSubmit: () => new Promise<void>((resolve) => (finish = resolve)),
      defaultValues: { name: "Jane", email: "jane@doe.example" },
    });
    await user.click(screen.getByRole("button", { name: "Add client" }));

    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
    finish();
    expect(
      await screen.findByRole("button", { name: "Add client" }),
    ).toBeEnabled();
  });

  it("shows the data layer's field errors inline and focuses that field", async () => {
    const { user } = renderForm({
      onSubmit: vi.fn().mockRejectedValue(
        new RepositoryError("validation", "Some fields are invalid", {
          email: ["This email is already used"],
        }),
      ),
      defaultValues: { name: "Jane", email: "jane@doe.example" },
    });
    await user.click(screen.getByRole("button", { name: "Add client" }));

    expect(
      await screen.findByText("This email is already used"),
    ).toBeInTheDocument();
    expect(emailInput()).toHaveFocus();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the input and shows an error when saving fails", async () => {
    const { user } = renderForm({
      onSubmit: vi
        .fn()
        .mockRejectedValue(new RepositoryError("simulated_failure", "nope")),
    });
    await user.type(nameInput(), "Jane Doe");
    await user.type(emailInput(), "jane@doe.example");
    await user.click(screen.getByRole("button", { name: "Add client" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't save the client",
    );
    expect(nameInput()).toHaveValue("Jane Doe");
    expect(screen.getByRole("button", { name: "Add client" })).toBeEnabled();
  });

  it("prefills values when editing and links Cancel back", () => {
    renderForm({
      defaultValues: { name: "Maya Chen", email: "maya@northwind.example" },
    });
    expect(nameInput()).toHaveValue("Maya Chen");
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/clients",
    );
  });
});
