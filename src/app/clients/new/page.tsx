import type { Metadata } from "next";
import { NewClientForm } from "@/features/clients/new-client-form";

export const metadata: Metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <section aria-labelledby="new-client-title" className="space-y-6">
      <h1 id="new-client-title" className="text-2xl font-semibold">
        New client
      </h1>
      <NewClientForm />
    </section>
  );
}
