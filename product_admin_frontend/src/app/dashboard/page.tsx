import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">
            Total Products
          </h2>
          <p className="mt-2 text-3xl font-bold text-slate-800">—</p>
          <p className="mt-1 text-xs text-slate-400">
            Connect the backend to see live data
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">
            Low Stock Items
          </h2>
          <p className="mt-2 text-3xl font-bold text-slate-800">—</p>
          <p className="mt-1 text-xs text-slate-400">
            Connect the backend to see live data
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">
            Total Categories
          </h2>
          <p className="mt-2 text-3xl font-bold text-slate-800">—</p>
          <p className="mt-1 text-xs text-slate-400">
            Connect the backend to see live data
          </p>
        </div>
      </div>

      <p className="mt-10 text-center text-sm text-slate-400">
        This is a UI placeholder. Once the API client is wired to real data,
        replace these static cards with server-fetched or client-fetched
        metrics.
      </p>
    </div>
  );
}
