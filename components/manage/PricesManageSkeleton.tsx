import { CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS, CONTENT_PAGE_HEADER_FILTERS_ROW_CLASS, CONTENT_PAGE_HEADER_SHELL_CLASS } from '@/components/ContentPageHeader'

const ROW_COUNT = 8

/**
 * Skeleton matching `PricesManager` layout (header toolbar + product list panel).
 * @returns Non-interactive loading placeholder for prices manage
 */
export function PricesManageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white" aria-busy="true" aria-label="Loading prices manager">
      <div className={CONTENT_PAGE_HEADER_SHELL_CLASS}>
        <span className="h-5 w-32 shrink-0 animate-pulse rounded bg-gray-200" aria-hidden />
        <div className={CONTENT_PAGE_HEADER_FILTERS_ROW_CLASS}>
          <span className="h-8 min-w-0 flex-1 animate-pulse rounded-md bg-gray-200 sm:max-w-xs" aria-hidden />
        </div>
        <div className={CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="h-8 w-20 shrink-0 animate-pulse rounded-md bg-gray-200" aria-hidden />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full w-full flex-col md:flex-row">
          <div className="flex h-full min-h-0 w-full flex-1 flex-col md:w-1/2 md:border-r md:border-gray-200">
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 md:px-2 md:py-1.5">
              <div>
                <span className="block h-4 w-20 animate-pulse rounded bg-gray-200" aria-hidden />
                <span className="mt-1 block h-3 w-36 animate-pulse rounded bg-gray-100 md:hidden" aria-hidden />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col divide-y divide-gray-100">
              {Array.from({ length: ROW_COUNT }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 md:px-2 md:py-1.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="block h-4 w-3/4 max-w-[200px] animate-pulse rounded bg-gray-200" aria-hidden />
                    <span className="block h-3 w-1/2 max-w-[120px] animate-pulse rounded bg-gray-100" aria-hidden />
                  </div>
                  <span className="h-7 w-14 shrink-0 animate-pulse rounded border border-gray-200 bg-gray-50" aria-hidden />
                </div>
              ))}
            </div>
          </div>
          <div className="hidden h-full min-h-0 min-w-0 md:flex md:w-1/2 md:flex-col">
            <div className="border-b border-gray-200 px-2 py-1.5">
              <span className="block h-4 w-24 animate-pulse rounded bg-gray-200" aria-hidden />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="block h-8 w-full animate-pulse rounded-md bg-gray-100" aria-hidden />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
