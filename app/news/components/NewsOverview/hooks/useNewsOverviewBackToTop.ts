import { type RefObject, useEffect, useState } from 'react'

import { NEWS_OVERVIEW_BACK_TO_TOP_SCROLL_THRESHOLD_PX, type NewsOverviewTagFilter } from '@/app/news/lib/news-overview-ui'

/**
 * Scroll listener and button visibility for jumping back to the top of the feed.
 * @param args Scroll root ref plus current list/facet so listeners reset on session change
 * @returns Button visibility and scroll-to-top handler
 */
export function useNewsOverviewBackToTop(args: { scrollRootRef: RefObject<HTMLDivElement | null>; listSlug: string; tagFilter: NewsOverviewTagFilter }) {
  const { scrollRootRef, listSlug, tagFilter } = args
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const el = scrollRootRef.current
    if (!el) {
      return
    }
    function onScroll() {
      const node = scrollRootRef.current
      if (!node) {
        return
      }
      const next = node.scrollTop > NEWS_OVERVIEW_BACK_TO_TOP_SCROLL_THRESHOLD_PX
      setShowBackToTop((prev) => (prev === next ? prev : next))
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [listSlug, scrollRootRef, tagFilter])

  /**
   * Smoothly scroll the feed container back to the top.
   */
  function scrollArticleListToTop() {
    scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return {
    showBackToTop,
    scrollArticleListToTop,
  }
}
