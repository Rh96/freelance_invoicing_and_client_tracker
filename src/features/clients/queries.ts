import { useQuery } from "@tanstack/react-query";
import { useRepository } from "@/data/repository-context";

/** Query keys for clients. Mutations invalidate `clientKeys.all` to refresh every client query. */
export const clientKeys = {
  all: ["clients"] as const,
  list: () => [...clientKeys.all, "list"] as const,
  detail: (id: string) => [...clientKeys.all, "detail", id] as const,
};

/** All clients (archived included), sorted by name by the repository. */
export function useClients() {
  const repository = useRepository();
  return useQuery({
    queryKey: clientKeys.list(),
    queryFn: () => repository.listClients(),
  });
}

export function useClient(id: string) {
  const repository = useRepository();
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => repository.getClient(id),
  });
}
