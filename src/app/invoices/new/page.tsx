import type { Metadata } from "next";
import { Suspense } from "react";
import { NewInvoiceForm } from "@/features/invoices/new-invoice-form";

export const metadata: Metadata = { title: "New invoice" };

// `searchParams` is request-time data under cacheComponents, so it's read inside <Suspense>.
export default function NewInvoicePage({
  searchParams,
}: PageProps<"/invoices/new">) {
  return (
    <section aria-labelledby="new-invoice-title" className="space-y-6">
      <h1 id="new-invoice-title" className="text-2xl font-semibold">
        New invoice
      </h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        {searchParams.then(({ clientId }) => (
          <NewInvoiceForm
            initialClientId={
              typeof clientId === "string" ? clientId : undefined
            }
          />
        ))}
      </Suspense>
    </section>
  );
}
