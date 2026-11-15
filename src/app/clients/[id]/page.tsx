import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FlashMessage } from "@/components/flash-message";
import { ClientDetail } from "@/features/clients/client-detail";

export const metadata: Metadata = { title: "Client" };

// `params` is request-time data under cacheComponents, so it's read inside <Suspense>.
export default function ClientPage({ params }: PageProps<"/clients/[id]">) {
  return (
    <section className="space-y-6">
      <Link
        href="/clients"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← All clients
      </Link>
      <FlashMessage />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        {params.then(({ id }) => (
          <ClientDetail id={id} />
        ))}
      </Suspense>
    </section>
  );
}
