import type { Client } from "@/domain/client";

export type ClientFilterOptions = {
  /** Archived clients are hidden unless this is true ("Show archived" arrives in T9). */
  includeArchived?: boolean;
};

/** Case-insensitive match on name, company or email. Keeps the input order. */
export function filterClients(
  clients: readonly Client[],
  search: string,
  { includeArchived = false }: ClientFilterOptions = {},
): Client[] {
  const term = search.trim().toLocaleLowerCase();
  return clients.filter(
    (client) =>
      (includeArchived || client.archivedAt === null) &&
      (term === "" ||
        [client.name, client.company, client.email].some((field) =>
          field.toLocaleLowerCase().includes(term),
        )),
  );
}
