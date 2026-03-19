/**
 * Forbidden page for unauthorized module management pages.
 * @returns Minimal 403 page
 */
export default function ForbiddenPage() {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">403</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Forbidden</h1>
        <p className="mt-2 text-sm text-gray-600">You do not have permission to view this page.</p>
      </div>
    </main>
  )
}
