"use client";

import { useRouter } from "next/navigation";
import { useFlash } from "@/stores/flash";
import { ClientForm } from "./client-form";
import { useCreateClient } from "./mutations";

export function NewClientForm() {
  const router = useRouter();
  const createClient = useCreateClient();
  const showFlash = useFlash((state) => state.show);

  return (
    <ClientForm
      submitLabel="Add client"
      cancelHref="/clients"
      onSubmit={async (data) => {
        const client = await createClient.mutateAsync(data);
        showFlash(`${client.name} added.`);
        router.push(`/clients/${client.id}`);
      }}
    />
  );
}
