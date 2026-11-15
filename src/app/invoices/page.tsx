import type { Metadata } from "next";
import Link from "next/link";
import { FlashMessage } from "@/components/flash-message";
import { Button } from "@/components/ui/button";
import { InvoiceList } from "@/features/invoices/invoice-list";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <section aria-labelledby="invoices-title" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 id="invoices-title" className="text-2xl font-semibold">
          Invoices
        </h1>
        <Button asChild>
          <Link href="/invoices/new">New invoice</Link>
        </Button>
      </div>
      <FlashMessage />
      <InvoiceList />
    </section>
  );
}
