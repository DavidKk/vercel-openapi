'use client'

import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { useNewsOverviewFeedSession } from '@/app/news/components/NewsOverview/hooks/useNewsOverviewFeedSession'
import { useNewsOverviewRouteFacets } from '@/app/news/components/NewsOverview/hooks/useNewsOverviewRouteFacets'
import { NewsOverviewBackToTop } from '@/app/news/components/NewsOverview/NewsOverviewBackToTop'
import { NewsOverviewFeedColumn } from '@/app/news/components/NewsOverview/NewsOverviewFeedColumn'
import { NewsOverviewFooter } from '@/app/news/components/NewsOverview/NewsOverviewFooter'
import { NewsOverviewHeader } from '@/app/news/components/NewsOverview/NewsOverviewHeader'
import { NewsOverviewSidebar } from '@/app/news/components/NewsOverview/NewsOverviewSidebar'
import {
  getNewsOverviewEmptyStateVisible,
  getNewsOverviewErrorBannerVisible,
  getNewsOverviewHeadRefreshVisible,
  getNewsOverviewLoadMoreEnabled,
  getNewsOverviewMainFeedSkeleton,
} from '@/app/news/lib/news-feed-overview-display'
import { buildNewsOverviewTopicSidebar, NEWS_OVERVIEW_DEFAULT_FEED_MAX_SOURCES, NEWS_OVERVIEW_SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS } from '@/app/news/lib/news-overview-ui'
import { normalizeNewsListSlug } from '@/services/news/config/news-subcategories'
import { newsRegionSidebarRank } from '@/services/news/region/news-source-region-order'
import { filterNewsSources } from '@/services/news/sources/sources'

/**
 * News overview: flat list selector and a blog-style list (title + description) from the aggregated feed API.
 */
export function NewsOverview() {
  const params = useParams<{ slug: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { listSlug, tagFilter, listSlugRef, tagFilterRef, replaceOverviewUrl, toggleFeedCategoryFacet, toggleTopicFacetRow, channelOptions } = useNewsOverviewRouteFacets({
    paramsSlug: params.slug,
    searchParams,
    pathname,
  })

  const feed = useNewsOverviewFeedSession({
    pathname,
    listSlug,
    tagFilter,
    listSlugRef,
    tagFilterRef,
    searchParamsKey: searchParams.toString(),
  })

  const topicSidebar = useMemo(() => buildNewsOverviewTopicSidebar(feed.feedFacets), [feed.feedFacets])

  const facetSourceCountById = useMemo(() => {
    const m = new Map<string, number>()
    for (const row of feed.feedFacets?.sources ?? []) {
      m.set(row.sourceId, row.count)
    }
    return m
  }, [feed.feedFacets])

  const partialErrorBySourceId = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of feed.partialErrors) {
      m.set(e.sourceId, e.message)
    }
    return m
  }, [feed.partialErrors])

  const partialWarmupBySourceId = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of feed.warmupSources) {
      m.set(e.sourceId, e.message)
    }
    return m
  }, [feed.warmupSources])

  const sourceInventoryById = useMemo(() => new Map((feed.sourceInventory ?? []).map((r) => [r.sourceId, r])), [feed.sourceInventory])

  /** All manifest sources for this channel (same cap as default feed merge), with pool + parsed counts when API sends inventory. */
  const sourceSidebarRows = useMemo(() => {
    const slug = normalizeNewsListSlug(listSlug)
    const base = filterNewsSources(undefined, undefined, undefined, slug).slice(0, NEWS_OVERVIEW_DEFAULT_FEED_MAX_SOURCES)
    return base
      .map((s, manifestIdx) => {
        const inv = sourceInventoryById.get(s.id)
        const poolCount = inv?.poolCount ?? facetSourceCountById.get(s.id) ?? 0
        const parsedCount = inv?.parsedCount ?? 0
        return {
          manifestIdx,
          region: s.region,
          sourceId: s.id,
          label: s.label,
          siteUrl: s.defaultUrl?.trim() ?? '',
          poolCount,
          parsedCount,
        }
      })
      .sort((a, b) => {
        const dr = newsRegionSidebarRank(a.region) - newsRegionSidebarRank(b.region)
        if (dr !== 0) {
          return dr
        }
        return a.manifestIdx - b.manifestIdx
      })
      .map(({ manifestIdx, region, ...row }) => {
        void manifestIdx
        void region
        return row
      })
  }, [listSlug, facetSourceCountById, sourceInventoryById])

  const topicFacetCount = topicSidebar.main.length
  const showTopicSidebar = topicFacetCount > NEWS_OVERVIEW_SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS
  const showSourceSidebar = sourceSidebarRows.length > 0

  /**
   * Clear sidebar facet and drop facet params from the URL (same list).
   */
  const clearTagFilterAndReload = useCallback(() => {
    replaceOverviewUrl({ listSlug: listSlugRef.current, tagFilter: null })
  }, [listSlugRef, replaceOverviewUrl])

  const handleSourceFacetToggle = useCallback(
    ({ sourceId, currentlySelected }: { sourceId: string; currentlySelected: boolean }) => {
      const slug = listSlugRef.current
      if (currentlySelected) {
        replaceOverviewUrl({ listSlug: slug, tagFilter: null })
      } else {
        replaceOverviewUrl({ listSlug: slug, tagFilter: { kind: 'src', sourceId } })
      }
    },
    [listSlugRef, replaceOverviewUrl]
  )

  /** Full-column skeleton: network wait, or list cleared while L0 (IndexedDB) is still being read for this session. */
  const showMainFeedSkeleton = getNewsOverviewMainFeedSkeleton(feed.loading, feed.feedSessionBootstrap, feed.items.length)
  const showHeadRefreshSkeleton = getNewsOverviewHeadRefreshVisible(feed.loading, feed.initialFeedRequestSettled, feed.items.length, feed.warmupRefreshUiBusy)
  const showEmptyState = getNewsOverviewEmptyStateVisible(showMainFeedSkeleton, feed.items.length, feed.error)
  const showErrorBanner = getNewsOverviewErrorBannerVisible(feed.error, feed.loading, feed.feedSessionBootstrap, feed.items.length)
  const loadMoreEnabled = getNewsOverviewLoadMoreEnabled(feed.loading, feed.loadingMore, feed.hasMore, feed.initialFeedRequestSettled, feed.items.length)

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <NewsOverviewHeader listSlug={listSlug} channelOptions={channelOptions} onListSlugChange={replaceOverviewUrl} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
        <div className="relative min-h-0 min-w-0 flex-1 basis-0">
          <NewsOverviewFeedColumn
            scrollRootRef={feed.scrollRootRef}
            sentinelRef={feed.sentinelRef}
            showErrorBanner={showErrorBanner}
            error={feed.error}
            showMainFeedSkeleton={showMainFeedSkeleton}
            showEmptyState={showEmptyState}
            items={feed.items}
            itemRowKeys={feed.itemRowKeys}
            tagFilter={tagFilter}
            showHeadRefreshSkeleton={showHeadRefreshSkeleton}
            warmupRefreshUiBusy={feed.warmupRefreshUiBusy}
            onToggleFeedCategoryFacet={toggleFeedCategoryFacet}
            enteringItemKeys={feed.enteringItemKeys}
            expandedSummaryKeys={feed.expandedSummaryKeys}
            onExpandedSummaryKeysChange={feed.setExpandedSummaryKeys}
            loadingMore={feed.loadingMore}
            loadMoreEnabled={loadMoreEnabled}
            hasMore={feed.hasMore}
            partialErrors={feed.partialErrors}
            warmupSources={feed.warmupSources}
            manualWarmupRetryUnlocked={feed.manualWarmupRetryUnlocked}
            onManualWarmupRetry={feed.runManualWarmupRetry}
          />
          <NewsOverviewBackToTop visible={feed.showBackToTop} onClick={feed.scrollArticleListToTop} />
        </div>

        <NewsOverviewSidebar
          showSourceSidebar={showSourceSidebar}
          sourceSidebarRows={sourceSidebarRows}
          tagFilter={tagFilter}
          partialErrorBySourceId={partialErrorBySourceId}
          partialWarmupBySourceId={partialWarmupBySourceId}
          onToggleSourceFacet={handleSourceFacetToggle}
          showTopicSidebar={showTopicSidebar}
          topicSidebar={topicSidebar}
          onToggleTopicFacetRow={toggleTopicFacetRow}
          onClearFilters={clearTagFilterAndReload}
        />
      </div>

      <NewsOverviewFooter showMainFeedSkeleton={showMainFeedSkeleton} totalArticleCount={feed.totalArticleCount} loadedItemCount={feed.items.length} />
    </div>
  )
}
