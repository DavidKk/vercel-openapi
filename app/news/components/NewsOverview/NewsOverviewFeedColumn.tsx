import { memo, type RefObject, useCallback } from 'react'
import { TbNews } from 'react-icons/tb'

import { getNewsFeedItemListKey } from '@/app/news/lib/news-feed-item-key'
import type { NewsOverviewTagFilter } from '@/app/news/lib/news-overview-ui'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import type { AggregatedNewsItem } from '@/services/news/types'

import { NewsOverviewArticleCard } from './NewsOverviewArticleCard'

const MemoizedNewsOverviewArticleCard = memo(
  NewsOverviewArticleCard,
  (prev, next) =>
    prev.item === next.item &&
    prev.rowKey === next.rowKey &&
    prev.rowEnter === next.rowEnter &&
    prev.tagFilter === next.tagFilter &&
    prev.summaryExpanded === next.summaryExpanded &&
    prev.onToggleSummaryByRowKey === next.onToggleSummaryByRowKey &&
    prev.onToggleFeedCategoryFacet === next.onToggleFeedCategoryFacet
)

/**
 * Scrollable main column: error banner, skeletons, article list, load-more sentinel, warmup / partial-error status.
 * @param props Refs and visibility flags from the parent container
 * @returns Feed column (scroll root + inner content)
 */
export const NewsOverviewFeedColumn = memo(function NewsOverviewFeedColumn(props: {
  scrollRootRef: RefObject<HTMLDivElement | null>
  sentinelRef: RefObject<HTMLDivElement | null>
  showErrorBanner: boolean
  error: string | null
  showMainFeedSkeleton: boolean
  showEmptyState: boolean
  items: AggregatedNewsItem[]
  itemRowKeys: string[]
  tagFilter: NewsOverviewTagFilter
  showHeadRefreshSkeleton: boolean
  warmupRefreshUiBusy: boolean
  onToggleFeedCategoryFacet: (value: string) => void
  enteringItemKeys: ReadonlySet<string>
  expandedSummaryKeys: Record<string, true>
  onExpandedSummaryKeysChange: (updater: (prev: Record<string, true>) => Record<string, true>) => void
  loadingMore: boolean
  loadMoreEnabled: boolean
  hasMore: boolean
  partialErrors: { sourceId: string; message: string }[]
  warmupSources: { sourceId: string; message: string }[]
  manualWarmupRetryUnlocked: boolean
  onManualWarmupRetry: () => void
}) {
  const {
    scrollRootRef,
    sentinelRef,
    showErrorBanner,
    error,
    showMainFeedSkeleton,
    showEmptyState,
    items,
    itemRowKeys,
    tagFilter,
    showHeadRefreshSkeleton,
    warmupRefreshUiBusy,
    onToggleFeedCategoryFacet,
    enteringItemKeys,
    expandedSummaryKeys,
    onExpandedSummaryKeysChange,
    loadingMore,
    loadMoreEnabled,
    hasMore,
    partialErrors,
    warmupSources,
    manualWarmupRetryUnlocked,
    onManualWarmupRetry,
  } = props

  const onToggleSummaryByRowKey = useCallback(
    (rowKey: string) => {
      onExpandedSummaryKeysChange((prev) => {
        const next = { ...prev }
        if (next[rowKey]) {
          delete next[rowKey]
        } else {
          next[rowKey] = true
        }
        return next
      })
    },
    [onExpandedSummaryKeysChange]
  )

  return (
    <div
      ref={scrollRootRef}
      className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {showErrorBanner ? <div className="rounded-lg border border-red-100 bg-red-50/80 px-4 py-3 text-[13px] text-red-800">{error}</div> : null}

      {showMainFeedSkeleton ? (
        <ul className="mx-auto max-w-3xl shrink-0 space-y-3" aria-busy="true" aria-label="Loading articles">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-3 w-5/6 rounded bg-gray-100" />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {showEmptyState ? (
        <div className="flex min-h-[50vh] w-full shrink-0 flex-col">
          <EmptyState icon={<TbNews className="h-12 w-12 text-gray-400/30 opacity-70" />} message="No articles yet" />
        </div>
      ) : null}

      {!showMainFeedSkeleton && items.length > 0 ? (
        <ul className="mx-auto max-w-3xl shrink-0 space-y-3" aria-label="Article list">
          {showHeadRefreshSkeleton ? (
            <li
              key="news-feed-warmup-head-loading"
              className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              aria-busy="true"
              aria-live="polite"
              aria-label="Loading newer articles"
            >
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-3 w-5/6 rounded bg-gray-100" />
              </div>
            </li>
          ) : null}
          {items.map((item, rowIdx) => {
            const baseListKey = getNewsFeedItemListKey(item)
            const rowKey = itemRowKeys[rowIdx] ?? baseListKey
            const summaryExpanded = Boolean(expandedSummaryKeys[rowKey])
            const rowEnter = enteringItemKeys.has(baseListKey)
            return (
              <MemoizedNewsOverviewArticleCard
                key={rowKey}
                item={item}
                rowKey={rowKey}
                rowEnter={rowEnter}
                tagFilter={tagFilter}
                summaryExpanded={summaryExpanded}
                onToggleSummaryByRowKey={onToggleSummaryByRowKey}
                onToggleFeedCategoryFacet={onToggleFeedCategoryFacet}
              />
            )
          })}
        </ul>
      ) : null}

      {loadingMore ? (
        <ul className="mx-auto mt-3 max-w-3xl shrink-0 space-y-3" aria-busy="true" aria-label="Loading more articles">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={`more-${i}`} className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="h-4 w-2/3 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/4 rounded bg-gray-100" />
              <div className="mt-3 h-3 w-full rounded bg-gray-100" />
            </li>
          ))}
        </ul>
      ) : null}

      {!showMainFeedSkeleton && !loadingMore && loadMoreEnabled ? <div ref={sentinelRef} className="mx-auto h-2 max-w-3xl shrink-0" aria-hidden /> : null}

      {!showMainFeedSkeleton && !loadingMore && !hasMore && items.length > 0 ? (
        <p className="mx-auto mt-6 max-w-3xl text-center text-[11px] text-gray-400" role="status">
          End of the list.
        </p>
      ) : null}

      {!showMainFeedSkeleton && (warmupSources.length > 0 || partialErrors.length > 0) ? (
        <div className="mx-auto mt-4 max-w-3xl space-y-2 text-[11px]" role="region" aria-label="Feed source status">
          {warmupSources.length > 0 ? (
            <p className="text-sky-900/90">
              部分来源仍在预热；每 5 秒仅对未就绪来源自动重试（离开页面后停止）。
              {warmupRefreshUiBusy ? ' 正在重试…' : ''}
            </p>
          ) : null}
          {partialErrors.length > 0 ? <p className="text-amber-900/90">部分来源返回错误（如 HTTP 403/500）：{partialErrors.map((e) => e.sourceId).join(', ')}</p> : null}
          {warmupSources.length > 0 ? (
            <Button type="button" variant="outline" size="sm" disabled={!manualWarmupRetryUnlocked || warmupRefreshUiBusy} onClick={() => void onManualWarmupRetry()}>
              {manualWarmupRetryUnlocked ? '立即重试未就绪来源' : '约 5 秒后可手动重试'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})
