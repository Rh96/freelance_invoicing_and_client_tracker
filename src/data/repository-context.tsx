"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Repository } from "./repository";

const RepositoryContext = createContext<Repository | null>(null);

/** Provides the data layer to client components. Tests pass a fake repository here. */
export function RepositoryProvider({
  repository,
  children,
}: {
  repository: Repository;
  children: ReactNode;
}) {
  return <RepositoryContext value={repository}>{children}</RepositoryContext>;
}

export function useRepository(): Repository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    throw new Error("useRepository must be used inside <RepositoryProvider>");
  }
  return repository;
}
