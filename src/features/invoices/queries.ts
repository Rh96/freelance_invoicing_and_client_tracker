import { useQuery } from "@tanstack/react-query";
import { useRepository } from "@/data/repository-context";

/** Query keys for invoices. Mutations invalidate `invoiceKeys.all`. */
export const invoiceKeys = {
  all: ["invoices"] as const,
  list: () => [...invoiceKeys.all, "list"] as const,
  detail: (id: string) => [...invoiceKeys.all, "detail", id] as const,
};

/** All invoices, newest number first (repository order). Filter per client or status in the UI. */
export function useInvoices() {
  const repository = useRepository();
  return useQuery({
    queryKey: invoiceKeys.list(),
    queryFn: () => repository.listInvoices(),
  });
}

export function useInvoice(id: string) {
  const repository = useRepository();
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => repository.getInvoice(id),
  });
}
