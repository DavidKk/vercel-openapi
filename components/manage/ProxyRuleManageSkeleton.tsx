import {
  CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS,
  CONTENT_PAGE_HEADER_FILTERS_ROW_CLASS,
  CONTENT_PAGE_HEADER_SHELL_CLASS,
  CONTENT_PAGE_HEADER_TOOLBAR_CLASS,
} from '@/components/ContentPageHeader'

const GRID_COLS = 'grid w-full min-w-[960px] grid-cols-[4rem_168px_minmax(0,1fr)_140px_minmax(7rem,1fr)_5rem]'

const ACTION_PLACEHOLDER_WIDTHS = ['w-[4.75rem]', 'w-14', 'w-14', 'w-12'] as const

/**
 * Skeleton matching `ProxyRuleManageEditor` (toolbar + rules table).
 * @returns Non-interactive loading placeholder for proxy-rule manage
 */
export function ProxyRuleManageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white" aria-busy="true" aria-label="Loading clash rules manager">
      <div className={`${CONTENT_PAGE_HEADER_SHELL_CLASS} bg-white`}>
        <span className="h-5 w-40 shrink-0 animate-pulse rounded bg-gray-200" aria-hidden />
        <div className={CONTENT_PAGE_HEADER_TOOLBAR_CLASS}>
          <div className={CONTENT_PAGE_HEADER_FILTERS_ROW_CLASS}>
            <span className="h-8 w-[168px] shrink-0 animate-pulse rounded-md bg-gray-200" aria-hidden />
            <span className="h-8 min-w-0 flex-1 animate-pulse rounded-md bg-gray-200 sm:max-w-[11rem]" aria-hidden />
          </div>
          <div className={CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS}>
            {ACTION_PLACEHOLDER_WIDTHS.map((widthClass, i) => (
              <span key={i} className={`h-8 shrink-0 animate-pulse rounded-md bg-gray-200 ${widthClass}`} aria-hidden />
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-gray-200">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto">
          <div className="flex min-h-0 min-w-[960px] flex-1 flex-col">
            <div className={`shrink-0 ${GRID_COLS} border-b border-gray-200 bg-gray-50 py-2.5`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="mx-3 block h-3 animate-pulse rounded bg-gray-200" aria-hidden />
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`${GRID_COLS} border-b border-gray-100 py-2`}>
                  <span className="mx-2 block h-8 animate-pulse rounded bg-gray-100" aria-hidden />
                  <span className="mx-3 block h-8 animate-pulse rounded-md bg-gray-100" aria-hidden />
                  <span className="mx-3 block h-8 animate-pulse rounded-md bg-gray-100" aria-hidden />
                  <span className="mx-3 block h-8 animate-pulse rounded-md bg-gray-100" aria-hidden />
                  <span className="mx-3 block h-8 animate-pulse rounded-md bg-gray-100" aria-hidden />
                  <span className="mx-3 block h-8 w-16 animate-pulse rounded-md bg-gray-100" aria-hidden />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
