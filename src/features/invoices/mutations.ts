import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRepository } from "@/data/repository-context";
import type { Invoice, InvoiceInput } from "@/domain/invoice";
import { withStatus, type InvoiceStatus } from "@/domain/invoice-status";
import { invoiceKeys } from "./queries";

function useOnInvoiceSaved() {
  const queryClient = useQueryClient();
  return async (invoice: Invoice) => {
    queryClient.setQueryData(invoiceKeys.detail(invoice.id), invoice);
    await queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
  };
}

export function useCreateInvoice() {
  const repository = useRepository();
  const onSaved = useOnInvoiceSaved();
  return useMutation({
    mutationFn: (input: InvoiceInput) => repository.createInvoice(input),
    onSuccess: onSaved,
  });
}

export function useUpdateInvoice() {
  const repository = useRepository();
  const onSaved = useOnInvoiceSaved();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InvoiceInput }) =>
      repository.updateInvoice(id, input),
    onSuccess: onSaved,
  });
}

type SetStatusVariables = { invoice: Invoice; to: InvoiceStatus };

/**
 * Optimistic status change: the cache shows the new status at once (same rule as the
 * repository, via `withStatus`), rolls back if saving fails, then refetches either way.
 */
export function useSetInvoiceStatus() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoice, to }: SetStatusVariables) =>
      repository.setInvoiceStatus(invoice.id, to),
    onMutate: async ({ invoice, to }: SetStatusVariables) => {
      // Stop in-flight refetches so they can't overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: invoiceKeys.all });
      const detailKey = invoiceKeys.detail(invoice.id);
      const previousDetail = queryClient.getQueryData<Invoice>(detailKey);
      const previousList = queryClient.getQueryData<Invoice[]>(
        invoiceKeys.list(),
      );

      // Prefer the freshest cached copy over the (possibly stale) object the caller passed.
      const current =
        previousDetail ??
        previousList?.find((item) => item.id === invoice.id) ??
        invoice;
      const optimistic = withStatus(current, to, new Date().toISOString());
      queryClient.setQueryData(detailKey, optimistic);
      queryClient.setQueryData<Invoice[]>(invoiceKeys.list(), (list) =>
        list?.map((item) => (item.id === invoice.id ? optimistic : item)),
      );
      return { previousDetail, previousList };
    },
    onError: (_error, { invoice }, context) => {
      if (!context) return;
      queryClient.setQueryData(
        invoiceKeys.detail(invoice.id),
        context.previousDetail,
      );
      queryClient.setQueryData(invoiceKeys.list(), context.previousList);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}
