import type { Metadata } from "next";
import { Suspense } from "react";
import { EditClient } from "@/features/clients/edit-client";

export const metadata: Metadata = { title: "Edit client" };

// With cacheComponents, `params` is only known at request time, so it is read inside
// <Suspense> instead of awaited at the top; the heading stays in the static shell.
export default function EditClientPage({
  params,
}: PageProps<"/clients/[id]/edit">) {
  return (
    <section aria-labelledby="edit-client-title" className="space-y-6">
      <h1 id="edit-client-title" className="text-2xl font-semibold">
        Edit client
      </h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        {params.then(({ id }) => (
          <EditClient id={id} />
        ))}
      </Suspense>
    </section>
  );
}
