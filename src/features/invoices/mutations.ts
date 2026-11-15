import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRepository } from "@/data/repository-context";
import type { Invoice, InvoiceInput } from "@/domain/invoice";
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
