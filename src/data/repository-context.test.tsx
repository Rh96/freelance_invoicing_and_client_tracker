import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createLocalStorageRepository } from "./local-storage-repository";
import { RepositoryProvider, useRepository } from "./repository-context";

describe("useRepository", () => {
  it("returns the provided repository", () => {
    const repository = createLocalStorageRepository({ latencyMs: 0 });
    const { result } = renderHook(() => useRepository(), {
      wrapper: ({ children }) => (
        <RepositoryProvider repository={repository}>
          {children}
        </RepositoryProvider>
      ),
    });
    expect(result.current).toBe(repository);
  });

  it("fails clearly outside the provider", () => {
    function Consumer() {
      useRepository();
      return null;
    }
    vi.spyOn(console, "error").mockImplementation(() => {}); // React logs the thrown error
    expect(() => render(<Consumer />)).toThrow(
      "useRepository must be used inside <RepositoryProvider>",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
