"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isRepositoryError } from "@/data/repository";
import { useFlash } from "@/stores/flash";
import { ClientForm } from "./client-form";
import { useUpdateClient } from "./mutations";
import { useClient } from "./queries";

export function EditClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: client, status, error, refetch, isFetching } = useClient(id);
  const updateClient = useUpdateClient();
  const showFlash = useFlash((state) => state.show);

  if (status === "pending") {
    return (
      <div aria-busy="true" className="max-w-lg space-y-4">
        <p role="status" className="sr-only">
          Loading client…
        </p>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-14 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    const notFound = isRepositoryError(error) && error.code === "not_found";
    return (
      <div role="alert" className="max-w-lg space-y-3 rounded-md border p-4">
        {notFound ? (
          <>
            <p>This client doesn&apos;t exist.</p>
            <Link
              href="/clients"
              className="font-medium underline underline-offset-4"
            >
              Back to clients
            </Link>
          </>
        ) : (
          <>
            <p>Couldn&apos;t load this client.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? "Retrying…" : "Retry"}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <ClientForm
      defaultValues={client}
      submitLabel="Save changes"
      cancelHref="/clients"
      onSubmit={async (data) => {
        const saved = await updateClient.mutateAsync({ id, input: data });
        showFlash(`${saved.name} updated.`);
        router.push("/clients"); // TBD (T9): go to the client detail page instead
      }}
    />
  );
}
