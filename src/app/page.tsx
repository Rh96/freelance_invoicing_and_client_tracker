import { Dashboard } from "@/features/dashboard/dashboard";

export default function DashboardPage() {
  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <h1 id="dashboard-title" className="text-2xl font-semibold">
        Dashboard
      </h1>
      <Dashboard />
    </section>
  );
}
