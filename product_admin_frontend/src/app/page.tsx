import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="mb-4 text-4xl font-bold text-slate-800">
        Product Admin
      </h1>
      <p className="mb-8 max-w-lg text-lg text-slate-600">
        Product administration system — university software project.
        Developed by <strong>Pair 3</strong>.
      </p>

      <div className="flex gap-4">
        <Link
          href="/products"
          className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          View Products
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Dashboard
        </Link>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">
            Products
          </h2>
          <p className="text-sm text-slate-600">
            Browse, create, update, and delete products. Data comes from local
            mocks during development.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">
            API-First
          </h2>
          <p className="text-sm text-slate-600">
            Decoupled from the backend via a typed API client. Flip
            <code className="mx-1 rounded bg-slate-100 px-1 text-xs">
              USE_MOCKS
            </code>
            to connect the real Python backend.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">
            Cloudinary
          </h2>
          <p className="text-sm text-slate-600">
            Image upload configured via unsigned presets. Configure env vars
            — no secrets committed.
          </p>
        </div>
      </div>
    </div>
  );
}
