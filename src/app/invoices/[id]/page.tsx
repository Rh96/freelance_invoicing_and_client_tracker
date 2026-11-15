import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FlashMessage } from "@/components/flash-message";
import { InvoiceDetail } from "@/features/invoices/invoice-detail";

export const metadata: Metadata = { title: "Invoice" };

// `params` is request-time data under cacheComponents, so it's read inside <Suspense>.
export default function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  return (
    <section className="space-y-6">
      <Link
        href="/invoices"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← All invoices
      </Link>
      <FlashMessage />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        {params.then(({ id }) => (
          <InvoiceDetail id={id} />
        ))}
      </Suspense>
    </section>
  );
}
