import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { createLocalStorageRepository } from "@/data/local-storage-repository";
import { RepositoryProvider } from "@/data/repository-context";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

function renderShell() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider
        repository={createLocalStorageRepository({ latencyMs: 0 })}
      >
        <AppShell>
          <h1>Page content</h1>
        </AppShell>
      </RepositoryProvider>
    </QueryClientProvider>,
  );
}

it("has header, main and footer landmarks around the page", () => {
  renderShell();
  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByRole("main")).toContainElement(
    screen.getByRole("heading", { name: "Page content" }),
  );
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
});

it("offers a skip link as the first focusable element, targeting main", async () => {
  const user = userEvent.setup();
  renderShell();
  await user.tab();
  const skip = screen.getByRole("link", { name: "Skip to main content" });
  expect(skip).toHaveFocus();
  expect(skip).toHaveAttribute("href", "#main");
  expect(screen.getByRole("main")).toHaveAttribute("id", "main");
});
