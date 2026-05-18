/**
 * Skeleton for module manage placeholder pages (authenticated shell, content loads quickly).
 * @returns Centered placeholder skeleton
 */
export function ManagePlaceholderSkeleton() {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-gray-50 px-4" aria-busy="true" aria-label="Loading manage page">
      <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto block h-3 w-16 animate-pulse rounded bg-gray-200" aria-hidden />
        <span className="mx-auto mt-4 block h-8 w-48 animate-pulse rounded bg-gray-200" aria-hidden />
        <span className="mx-auto mt-3 block h-4 w-full max-w-sm animate-pulse rounded bg-gray-100" aria-hidden />
        <span className="mx-auto mt-2 block h-4 w-4/5 max-w-xs animate-pulse rounded bg-gray-100" aria-hidden />
      </div>
    </main>
  )
}
