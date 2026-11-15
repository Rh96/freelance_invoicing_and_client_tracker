import type { Metadata } from "next";
import Link from "next/link";
import { FlashMessage } from "@/components/flash-message";
import { Button } from "@/components/ui/button";
import { ClientList } from "@/features/clients/client-list";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <section aria-labelledby="clients-title" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 id="clients-title" className="text-2xl font-semibold">
          Clients
        </h1>
        <Button asChild>
          <Link href="/clients/new">New client</Link>
        </Button>
      </div>
      <FlashMessage />
      <ClientList />
    </section>
  );
}
