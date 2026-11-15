import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { Repository } from "@/data/repository";
import { RepositoryError } from "@/data/repository";
import { RepositoryProvider } from "@/data/repository-context";
import { ResetDemoDataButton } from "./reset-demo-data-button";

function renderButton(resetData: Repository["resetData"]) {
  const repository = { resetData } as Repository; // only resetData is used here
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repository={repository}>
        <ResetDemoDataButton />
      </RepositoryProvider>
    </QueryClientProvider>,
  );
  return { invalidate };
}

it("asks for confirmation, resets, refreshes data and announces it", async () => {
  const user = userEvent.setup();
  const resetData = vi.fn().mockResolvedValue(undefined);
  const { invalidate } = renderButton(resetData);

  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  expect(
    screen.getByRole("alertdialog", { name: "Reset demo data?" }),
  ).toBeInTheDocument();
  expect(resetData).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Reset data" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(resetData).toHaveBeenCalledTimes(1);
  expect(invalidate).toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent("Demo data restored.");
});

it("does nothing when cancelled", async () => {
  const user = userEvent.setup();
  const resetData = vi.fn();
  renderButton(resetData);

  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(resetData).not.toHaveBeenCalled();
});

it("keeps the dialog open and shows an error when the reset fails", async () => {
  const user = userEvent.setup();
  const resetData = vi
    .fn()
    .mockRejectedValue(
      new RepositoryError("simulated_failure", "Simulated failure"),
    );
  renderButton(resetData);

  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Reset data" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Couldn't reset the data",
  );
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
});
