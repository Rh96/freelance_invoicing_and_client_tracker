"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createLocalStorageRepository } from "@/data/local-storage-repository";
import { RepositoryProvider } from "@/data/repository-context";
import { createSeedStore } from "@/data/seed";
import { createShouldFail } from "@/data/simulate-errors";

export function Providers({ children }: { children: ReactNode }) {
  // useState keeps one instance per browser session (and a fresh one per server render).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Storage is local: a retry can't fix a failure, and it would hide simulated errors.
          queries: { retry: false, staleTime: 30_000 },
          mutations: { retry: false },
        },
      }),
  );
  // Nothing touches localStorage until the first call, so creating this during SSR is safe.
  const [repository] = useState(() =>
    createLocalStorageRepository({
      initialData: () => createSeedStore(),
      shouldFail: createShouldFail(),
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repository={repository}>
        {children}
      </RepositoryProvider>
    </QueryClientProvider>
  );
}
