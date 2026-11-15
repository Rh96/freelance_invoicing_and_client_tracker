import { act, render, screen } from "@testing-library/react";
import { Activity } from "react";
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

it("shows a message that arrives while the page is already mounted", async () => {
  render(<FlashMessage />);
  act(() => useFlash.getState().show("Maya Chen updated."));
  expect(await screen.findByText("Maya Chen updated.")).toBeInTheDocument();
  expect(useFlash.getState().message).toBeNull();
});

it("leaves the message for the visible page while hidden, then shows it when revealed", async () => {
  // Next 16 keeps recent pages mounted inside <Activity mode="hidden">.
  const { rerender } = render(
    <Activity mode="hidden">
      <FlashMessage />
    </Activity>,
  );
  act(() => useFlash.getState().show("Maya Chen updated."));
  await act(() => new Promise((r) => requestAnimationFrame(r)));
  expect(useFlash.getState().message).toBe("Maya Chen updated."); // not consumed while hidden

  rerender(
    <Activity mode="visible">
      <FlashMessage />
    </Activity>,
  );
  expect(await screen.findByText("Maya Chen updated.")).toBeVisible();
});

it("doesn't show an old message again after the page was hidden and shown", async () => {
  useFlash.getState().show("Jane Doe added.");
  const { rerender } = render(
    <Activity mode="visible">
      <FlashMessage />
    </Activity>,
  );
  expect(await screen.findByText("Jane Doe added.")).toBeInTheDocument();

  rerender(
    <Activity mode="hidden">
      <FlashMessage />
    </Activity>,
  );
  rerender(
    <Activity mode="visible">
      <FlashMessage />
    </Activity>,
  );
  await act(() => new Promise((r) => requestAnimationFrame(r)));
  expect(screen.queryByText("Jane Doe added.")).toBeNull();
});
