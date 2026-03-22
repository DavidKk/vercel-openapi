import { memo } from 'react'

import {
  NEWS_OVERVIEW_TOPICS_SIDEBAR_LABEL,
  newsOverviewSourceSidebarCountLabel,
  newsOverviewSourceSidebarRowTitle,
  type NewsOverviewTagFilter,
  type NewsOverviewTopicFacetRow,
  type NewsOverviewTopicSidebarBuckets,
} from '@/app/news/lib/news-overview-ui'

/**
 * Sources + Topics facet sidebar for the news overview.
 * @param props Row data and facet toggles (parent owns URL / list slug via callbacks)
 * @returns Aside column
 */
export const NewsOverviewSidebar = memo(function NewsOverviewSidebar(props: {
  showSourceSidebar: boolean
  sourceSidebarRows: { sourceId: string; label: string; siteUrl: string; poolCount: number; parsedCount: number }[]
  tagFilter: NewsOverviewTagFilter
  partialErrorBySourceId: Map<string, string>
  partialWarmupBySourceId: Map<string, string>
  onToggleSourceFacet: (args: { sourceId: string; currentlySelected: boolean }) => void
  showTopicSidebar: boolean
  topicSidebar: NewsOverviewTopicSidebarBuckets
  onToggleTopicFacetRow: (row: NewsOverviewTopicFacetRow) => void
  onClearFilters: () => void
}) {
  const {
    showSourceSidebar,
    sourceSidebarRows,
    tagFilter,
    partialErrorBySourceId,
    partialWarmupBySourceId,
    onToggleSourceFacet,
    showTopicSidebar,
    topicSidebar,
    onToggleTopicFacetRow,
    onClearFilters,
  } = props

  return (
    <aside
      className="flex min-h-0 w-[9.25rem] min-w-0 shrink-0 grow-0 flex-col overflow-hidden border-l border-gray-200 bg-white sm:w-36 lg:w-[13.5rem] xl:w-60"
      aria-label={`Sources and ${NEWS_OVERVIEW_TOPICS_SIDEBAR_LABEL}`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
        {showSourceSidebar ? (
          <section>
            <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700/90">Sources</h2>
            <div className="flex flex-col gap-1">
              {sourceSidebarRows.map(({ sourceId, label, siteUrl, poolCount, parsedCount }) => {
                const on = tagFilter?.kind === 'src' && tagFilter.sourceId === sourceId
                const hasPool = poolCount > 0
                const fetchError = partialErrorBySourceId.get(sourceId)
                const warmingHint = partialWarmupBySourceId.has(sourceId) ? '正在预热' : undefined
                const idleVisual = hasPool
                  ? 'border border-violet-200/90 bg-violet-50/90 text-violet-950 hover:bg-violet-100'
                  : 'border border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100/90'
                const countLabel = newsOverviewSourceSidebarCountLabel(poolCount, parsedCount)
                return (
                  <button
                    key={`src-${sourceId}`}
                    type="button"
                    onClick={() => onToggleSourceFacet({ sourceId, currentlySelected: on })}
                    className={`flex w-full max-w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                      on ? 'bg-violet-700 text-white' : idleVisual
                    }`}
                    title={newsOverviewSourceSidebarRowTitle({ label, siteUrl, poolCount, parsedCount, fetchError, warmingHint })}
                  >
                    <span className="min-w-0 truncate font-medium">{label}</span>
                    <span className={`shrink-0 tabular-nums ${on ? 'text-violet-100' : hasPool ? 'text-violet-700/90' : 'text-gray-400'}`}>{countLabel}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {showTopicSidebar ? (
          <section aria-label={`${NEWS_OVERVIEW_TOPICS_SIDEBAR_LABEL} (RSS categories and keywords)`}>
            <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800/90">{NEWS_OVERVIEW_TOPICS_SIDEBAR_LABEL}</h2>
            <div className="flex flex-col gap-1">
              {topicSidebar.main.map((row) => {
                const selected =
                  (row.facetKind === 'fk' && tagFilter?.kind === 'fk' && tagFilter.value === row.value) ||
                  (row.facetKind === 'fc' && tagFilter?.kind === 'fc' && tagFilter.value === row.value)
                const hint = row.facetKind === 'fk' ? 'Keyword' : 'RSS category'
                return (
                  <button
                    key={`topic-${row.facetKind}-${row.value}`}
                    type="button"
                    onClick={() => onToggleTopicFacetRow(row)}
                    title={`${hint} · ${row.value}`}
                    className={`flex w-full max-w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                      selected ? 'bg-indigo-800 text-white' : 'bg-indigo-50/90 text-indigo-950 ring-1 ring-indigo-200/75 hover:bg-indigo-100'
                    }`}
                  >
                    <span className="min-w-0 truncate font-medium">{row.value}</span>
                    <span className={`shrink-0 tabular-nums ${selected ? 'text-indigo-100' : 'text-indigo-800/85'}`}>{row.count}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
      <div className="shrink-0 border-t border-gray-100 p-2">
        <button
          type="button"
          disabled={!tagFilter}
          onClick={onClearFilters}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Clear filters
        </button>
      </div>
    </aside>
  )
})
