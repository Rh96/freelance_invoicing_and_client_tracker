import type { Metadata } from "next";
import { InvoiceList } from "@/features/invoices/invoice-list";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <section aria-labelledby="invoices-title" className="space-y-6">
      <h1 id="invoices-title" className="text-2xl font-semibold">
        Invoices
      </h1>
      <InvoiceList />
    </section>
  );
}
