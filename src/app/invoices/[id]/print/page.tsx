import type { Metadata } from "next";
import { Suspense } from "react";
import { PrintInvoice } from "@/features/invoices/print-invoice";

export const metadata: Metadata = { title: "Print invoice" };

// The app header and footer are hidden when printing (print:hidden in AppShell).
export default function PrintInvoicePage({
  params,
}: PageProps<"/invoices/[id]/print">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      {params.then(({ id }) => (
        <PrintInvoice id={id} />
      ))}
    </Suspense>
  );
}
