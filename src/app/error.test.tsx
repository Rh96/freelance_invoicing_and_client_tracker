import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ErrorPage from "./error";

it("explains the problem and retries on request", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const retry = vi.fn();
  render(<ErrorPage error={new Error("boom")} retry={retry} />);

  expect(
    screen.getByRole("heading", { name: "Something went wrong" }),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledTimes(1);
});
