import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  createLocalStorageRepository,
  type KeyValueStorage,
  type LocalStorageRepositoryOptions,
} from "@/data/local-storage-repository";
import type { Repository } from "@/data/repository";
import { RepositoryProvider } from "@/data/repository-context";

/** In-memory stand-in for localStorage. */
export function memoryStorage(): KeyValueStorage & {
  data: Map<string, string>;
} {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

/** A real repository over in-memory storage with no latency, unless overridden. */
export function testRepository(
  options: LocalStorageRepositoryOptions = {},
): Repository {
  return createLocalStorageRepository({
    storage: memoryStorage(),
    latencyMs: 0,
    ...options,
  });
}

/** Renders `ui` with a fresh QueryClient (no retries) and the given repository. */
export function renderWithProviders(
  ui: ReactElement,
  { repository = testRepository() }: { repository?: Repository } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repository={repository}>{ui}</RepositoryProvider>
    </QueryClientProvider>,
  );
  return { ...view, queryClient, repository };
}
