import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { logNewsOverview } from '@/app/news/lib/news-overview-client-log'
import { newsOverviewFacetLabelForLog, newsOverviewListSlugFromRouteParam, type NewsOverviewTagFilter, type NewsOverviewTopicFacetRow } from '@/app/news/lib/news-overview-ui'
import { getNewsListLabel, NEWS_LIST_SLUGS_ORDER, normalizeNewsListSlug } from '@/services/news/config/news-subcategories'
import { buildNewsOverviewHref, newsOverviewTagFiltersEqual, parseNewsFacetFromUrlSearchParams } from '@/services/news/routing/news-overview-url'

/**
 * Route-driven list slug, facet filter, and URL replace helpers for the news overview.
 * @param args Next.js route params, search params, pathname, and initial slug segment
 * @returns List state, refs mirrored for async guards, channel options, and facet toggles
 */
export function useNewsOverviewRouteFacets(args: {
  paramsSlug: string | string[] | undefined
  searchParams: Pick<URLSearchParams, 'get'> & { toString(): string }
  pathname: string
}) {
  const { paramsSlug, searchParams, pathname } = args
  const router = useRouter()

  const [listSlug, setListSlug] = useState(() => newsOverviewListSlugFromRouteParam(paramsSlug))
  const [tagFilter, setTagFilter] = useState<NewsOverviewTagFilter>(null)

  const listSlugRef = useRef(listSlug)
  const tagFilterRef = useRef<NewsOverviewTagFilter>(null)
  listSlugRef.current = listSlug
  tagFilterRef.current = tagFilter

  /** Dedupe `route_sync` logs when the URL-derived sync key is unchanged. */
  const lastRouteSyncKeyRef = useRef<string | null>(null)

  const facetSearchKey = searchParams.toString()
  const routeListSlug = useMemo(() => newsOverviewListSlugFromRouteParam(paramsSlug), [paramsSlug])
  const routeTagFilter = useMemo(() => parseNewsFacetFromUrlSearchParams(searchParams), [facetSearchKey])

  useEffect(() => {
    const syncKey = `${routeListSlug}|${facetSearchKey}`
    if (lastRouteSyncKeyRef.current !== syncKey) {
      lastRouteSyncKeyRef.current = syncKey
      logNewsOverview('route_sync', {
        pagePath: pathname,
        list: routeListSlug,
        searchParamsPresent: facetSearchKey.length > 0,
        facet: newsOverviewFacetLabelForLog(routeTagFilter),
      })
    }
    setListSlug((prev) => (prev === routeListSlug ? prev : routeListSlug))
    setTagFilter((prev) => (newsOverviewTagFiltersEqual(prev, routeTagFilter) ? prev : routeTagFilter))
  }, [facetSearchKey, pathname, routeListSlug, routeTagFilter])

  /**
   * Update `/news/[slug]` URL with optional `tag`, `keyword`, or `source` search params.
   */
  const replaceOverviewUrl = useCallback(
    (next: { listSlug: string; tagFilter: NewsOverviewTagFilter }) => {
      const slug = normalizeNewsListSlug(next.listSlug)
      const href = buildNewsOverviewHref(slug, next.tagFilter)
      logNewsOverview('router_replace', {
        pagePath: pathname,
        list: slug,
        facet: newsOverviewFacetLabelForLog(next.tagFilter),
        href,
      })
      router.replace(href, { scroll: false })
    },
    [router, pathname]
  )

  /**
   * Toggle RSS section facet (`feedCategory`); same URL/query behavior as the sidebar section list.
   * @param value RSS category label from `feedCategories`
   */
  const toggleFeedCategoryFacet = useCallback(
    (value: string) => {
      const slug = listSlugRef.current
      const on = tagFilter?.kind === 'fc' && tagFilter.value === value
      if (on) {
        replaceOverviewUrl({ listSlug: slug, tagFilter: null })
      } else {
        replaceOverviewUrl({ listSlug: slug, tagFilter: { kind: 'fc', value } })
      }
    },
    [tagFilter, replaceOverviewUrl]
  )

  /**
   * Toggle merged Topics row (`feedKeyword` vs `feedCategory` per {@link NewsOverviewTopicFacetRow.facetKind}).
   * @param row Merged facet row from the pool histogram
   */
  const toggleTopicFacetRow = useCallback(
    (row: NewsOverviewTopicFacetRow) => {
      if (row.facetKind === 'fk') {
        const slug = listSlugRef.current
        const on = tagFilter?.kind === 'fk' && tagFilter.value === row.value
        if (on) {
          replaceOverviewUrl({ listSlug: slug, tagFilter: null })
        } else {
          replaceOverviewUrl({ listSlug: slug, tagFilter: { kind: 'fk', value: row.value } })
        }
      } else {
        toggleFeedCategoryFacet(row.value)
      }
    },
    [tagFilter, replaceOverviewUrl, toggleFeedCategoryFacet]
  )

  const channelOptions = useMemo(() => NEWS_LIST_SLUGS_ORDER.map((slug) => ({ value: slug, label: getNewsListLabel(slug) })), [])

  return {
    listSlug,
    tagFilter,
    listSlugRef,
    tagFilterRef,
    replaceOverviewUrl,
    toggleFeedCategoryFacet,
    toggleTopicFacetRow,
    channelOptions,
  }
}
