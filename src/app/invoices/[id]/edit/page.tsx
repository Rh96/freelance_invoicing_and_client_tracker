import type { Metadata } from "next";
import { Suspense } from "react";
import { EditInvoice } from "@/features/invoices/edit-invoice";

export const metadata: Metadata = { title: "Edit invoice" };

export default function EditInvoicePage({
  params,
}: PageProps<"/invoices/[id]/edit">) {
  return (
    <section aria-labelledby="edit-invoice-title" className="space-y-6">
      <h1 id="edit-invoice-title" className="text-2xl font-semibold">
        Edit invoice
      </h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        {params.then(({ id }) => (
          <EditInvoice id={id} />
        ))}
      </Suspense>
    </section>
  );
}
