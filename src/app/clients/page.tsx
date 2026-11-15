import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients" };

// Placeholder until T7 (client list with search).
export default function ClientsPage() {
  return (
    <section aria-labelledby="clients-title" className="space-y-2">
      <h1 id="clients-title" className="text-2xl font-semibold">
        Clients
      </h1>
      <p className="text-muted-foreground">The client list is coming soon.</p>
    </section>
  );
}
