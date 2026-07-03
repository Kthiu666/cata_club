/**
 * Skeleton loader for the payment validation list.
 */

export default function PaymentSkeleton() {
  return (
    <div className="card overflow-hidden" aria-busy="true" aria-live="polite" role="status">
      <span className="sr-only">Cargando solicitudes de pago…</span>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cata-stone/60 bg-cata-warm">
              <th className="px-4 py-3"><div className="h-3 w-20 animate-pulse rounded bg-cata-stone/40" /></th>
              <th className="px-4 py-3"><div className="h-3 w-24 animate-pulse rounded bg-cata-stone/40" /></th>
              <th className="px-4 py-3"><div className="h-3 w-16 animate-pulse rounded bg-cata-stone/40" /></th>
              <th className="px-4 py-3 text-right"><div className="ml-auto h-3 w-12 animate-pulse rounded bg-cata-stone/40" /></th>
              <th className="px-4 py-3"><div className="h-3 w-16 animate-pulse rounded bg-cata-stone/40" /></th>
              <th className="px-4 py-3"><div className="h-3 w-20 animate-pulse rounded bg-cata-stone/40" /></th>
              <th className="px-4 py-3"><div className="h-3 w-14 animate-pulse rounded bg-cata-stone/40" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cata-stone/40">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-3 w-28 animate-pulse rounded bg-cata-stone/30" /></td>
                <td className="px-4 py-3"><div className="h-3 w-24 animate-pulse rounded bg-cata-stone/30" /></td>
                <td className="px-4 py-3"><div className="h-3 w-20 animate-pulse rounded bg-cata-stone/30" /></td>
                <td className="px-4 py-3 text-right"><div className="ml-auto h-3 w-14 animate-pulse rounded bg-cata-stone/30" /></td>
                <td className="px-4 py-3"><div className="h-3 w-24 animate-pulse rounded bg-cata-stone/30" /></td>
                <td className="px-4 py-3"><div className="h-3 w-24 animate-pulse rounded bg-cata-stone/30" /></td>
                <td className="px-4 py-3"><div className="h-5 w-20 animate-pulse rounded-full bg-cata-stone/30" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
