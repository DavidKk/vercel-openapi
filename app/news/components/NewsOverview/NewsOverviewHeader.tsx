import type { NewsOverviewTagFilter } from '@/app/news/lib/news-overview-ui'
import { DropdownSelect } from '@/components/DropdownSelect'
import { normalizeNewsListSlug } from '@/services/news/config/news-subcategories'

/**
 * Top bar: title, subtitle, and channel selector for the news overview.
 * @param props Current list slug, options, and URL replace when the channel changes
 * @returns Header row
 */
export function NewsOverviewHeader(props: {
  listSlug: string
  channelOptions: { value: string; label: string }[]
  onListSlugChange: (next: { listSlug: string; tagFilter: NewsOverviewTagFilter }) => void
}) {
  const { listSlug, channelOptions, onListSlugChange } = props

  return (
    <header className="flex shrink-0 min-w-0 flex-nowrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold text-gray-900">News</h1>
        <p className="mt-0.5 line-clamp-2 text-xs leading-tight text-gray-500">Aggregated feeds — pick a channel from the menu.</p>
      </div>
      <div className="ml-auto w-[11rem] shrink-0 sm:w-[14rem]">
        <label htmlFor="news-overview-list" className="sr-only">
          频道
        </label>
        <DropdownSelect
          id="news-overview-list"
          ariaLabel="选择新闻频道"
          value={listSlug}
          onChange={(nextRaw) => {
            const next = normalizeNewsListSlug(nextRaw)
            // Facets (tag / keyword / source) are list-specific; clear when switching channel.
            onListSlugChange({ listSlug: next, tagFilter: null })
          }}
          options={channelOptions}
          wrapperClassName="w-full"
          align="end"
        />
      </div>
    </header>
  )
}
