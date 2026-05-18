import { PricesManageSkeleton } from '@/components/manage'

/**
 * Instant shell while prices manage page loads data on the server.
 * @returns Prices manage skeleton
 */
export default function PricesManageLoading() {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <PricesManageSkeleton />
    </section>
  )
}
