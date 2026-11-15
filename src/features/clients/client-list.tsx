"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { isRepositoryError } from "@/data/repository";
import { useClientFilters } from "@/stores/client-filters";
import { filterClients } from "./filter-clients";
import { useClients } from "./queries";

export function ClientList() {
  const { data: clients, status, error, refetch, isFetching } = useClients();
  const search = useClientFilters((state) => state.search);
  const setSearch = useClientFilters((state) => state.setSearch);
  const clearSearch = useClientFilters((state) => state.clearSearch);
  const searchInput = useRef<HTMLInputElement>(null);

  const active = useMemo(() => filterClients(clients ?? [], ""), [clients]);
  const visible = useMemo(
    () => filterClients(clients ?? [], search),
    [clients, search],
  );

  if (status === "pending") {
    return (
      <div aria-busy="true" className="space-y-2">
        <p role="status" className="sr-only">
          Loading clients…
        </p>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-10 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    const corrupt = isRepositoryError(error) && error.code === "corrupt_data";
    return (
      <div role="alert" className="space-y-3 rounded-md border p-4">
        {corrupt ? (
          <p>
            Your saved data couldn&apos;t be read. Use &ldquo;Reset demo
            data&rdquo; at the bottom of the page to restore it.
          </p>
        ) : (
          <>
            <p>Couldn&apos;t load clients.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? "Retrying…" : "Retry"}
            </Button>
          </>
        )}
      </div>
    );
  }

  if (active.length === 0) {
    return <p className="text-muted-foreground">No clients yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="client-search" className="text-sm font-medium">
          Search clients
        </label>
        <input
          ref={searchInput}
          id="client-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, company or email"
          className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
        />
      </div>

      <p role="status" className="text-sm text-muted-foreground">
        {visible.length === active.length
          ? `${active.length} ${active.length === 1 ? "client" : "clients"}`
          : `${visible.length} of ${active.length} clients`}
      </p>

      {visible.length === 0 ? (
        <div className="space-y-3">
          <p>No clients match &ldquo;{search.trim()}&rdquo;.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearSearch();
              searchInput.current?.focus();
            }}
          >
            Clear search
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Clients</caption>
            <thead className="border-b bg-muted/50">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Name
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Company
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Email
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((client) => (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{client.name}</td>
                  <td className="px-3 py-2">{client.company || "—"}</td>
                  <td className="px-3 py-2">{client.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
