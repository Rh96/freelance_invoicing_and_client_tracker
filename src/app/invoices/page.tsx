import type { Metadata } from "next";

export const metadata: Metadata = { title: "Invoices" };

// Placeholder until T10 (invoice list with status filter).
export default function InvoicesPage() {
  return (
    <section aria-labelledby="invoices-title" className="space-y-2">
      <h1 id="invoices-title" className="text-2xl font-semibold">
        Invoices
      </h1>
      <p className="text-muted-foreground">The invoice list is coming soon.</p>
    </section>
  );
}
