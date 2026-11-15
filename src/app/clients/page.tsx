import type { Metadata } from "next";
import { ClientList } from "@/features/clients/client-list";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <section aria-labelledby="clients-title" className="space-y-6">
      <h1 id="clients-title" className="text-2xl font-semibold">
        Clients
      </h1>
      <ClientList />
    </section>
  );
}
