import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { useFlash } from "@/stores/flash";
import { FlashMessage } from "./flash-message";

beforeEach(() => {
  useFlash.setState({ message: null });
});

it("shows a pending message once, then clears it", async () => {
  useFlash.getState().show("Jane Doe added.");
  const first = render(<FlashMessage />);
  expect(await screen.findByText("Jane Doe added.")).toBeInTheDocument();
  expect(useFlash.getState().message).toBeNull();
  first.unmount();

  render(<FlashMessage />); // a later visit
  await new Promise((r) => requestAnimationFrame(r));
  expect(screen.queryByText("Jane Doe added.")).toBeNull();
});

it("renders the live region empty first so the message is announced", () => {
  useFlash.getState().show("Jane Doe added.");
  const { container } = render(<FlashMessage />);
  const region = container.querySelector('[aria-live="polite"]');
  expect(region).toBeEmptyDOMElement();
});

it("can be dismissed", async () => {
  const user = userEvent.setup();
  useFlash.getState().show("Jane Doe added.");
  render(<FlashMessage />);
  await user.click(await screen.findByRole("button", { name: "Dismiss" }));
  expect(screen.queryByText("Jane Doe added.")).toBeNull();
});
