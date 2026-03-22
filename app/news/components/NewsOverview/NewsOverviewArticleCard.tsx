import { useMemo } from 'react'

import { getNewsFeedItemDomSuffix } from '@/app/news/lib/news-feed-item-key'
import {
  NEWS_OVERVIEW_MAX_RSS_SECTION_CHIPS_PER_CARD,
  NEWS_OVERVIEW_RSS_TAG_LABEL,
  NEWS_OVERVIEW_SUMMARY_EXPAND_THRESHOLD_CHARS,
  newsOverviewFormatPublished,
  newsOverviewPlainTextFromHtml,
  type NewsOverviewTagFilter,
} from '@/app/news/lib/news-overview-ui'
import { Button } from '@/components/Button'
import { LazyImage } from '@/components/LazyImage'
import type { AggregatedNewsItem } from '@/services/news/types'

/**
 * One news card in the overview feed: title, optional image, RSS tag chips, summary with expand.
 * @param props Row render props from the parent list
 * @returns Article list item
 */
export function NewsOverviewArticleCard(props: {
  item: AggregatedNewsItem
  rowKey: string
  rowEnter: boolean
  tagFilter: NewsOverviewTagFilter
  summaryExpanded: boolean
  onToggleSummaryByRowKey: (rowKey: string) => void
  onToggleFeedCategoryFacet: (value: string) => void
}) {
  const { item, rowKey, rowEnter, tagFilter, summaryExpanded, onToggleSummaryByRowKey, onToggleFeedCategoryFacet } = props
  const desc = useMemo(() => newsOverviewPlainTextFromHtml(item.summary ?? ''), [item.summary])
  const fallbackDesc = useMemo(() => {
    const regionHint = item.region === 'cn' ? 'Mainland CN' : item.region === 'hk_tw' ? 'HK & TW' : 'International'
    return !desc ? `${item.sourceLabel} · ${regionHint}` : desc
  }, [desc, item.region, item.sourceLabel])
  const when = useMemo(() => newsOverviewFormatPublished(item.publishedAt), [item.publishedAt])
  const also = item.alsoFromSources ?? []
  const facetSrcId = tagFilter?.kind === 'src' ? tagFilter.sourceId : null
  const domSuf = getNewsFeedItemDomSuffix(rowKey)
  const summaryNeedsExpand = fallbackDesc.length > NEWS_OVERVIEW_SUMMARY_EXPAND_THRESHOLD_CHARS

  return (
    <li className={rowEnter ? 'news-feed-row-enter' : undefined}>
      <article className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${rowEnter ? 'news-feed-card-enter' : ''}`}>
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[15px] font-semibold leading-snug text-gray-900 underline-offset-2 hover:text-blue-700 hover:underline"
        >
          {item.title}
        </a>
        {item.imageUrl?.trim() ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block overflow-hidden rounded-lg ring-1 ring-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
            aria-label={`${item.title} — illustration`}
          >
            <div className="relative h-48 w-full bg-gray-100">
              <LazyImage src={item.imageUrl.trim()} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </div>
          </a>
        ) : null}
        {item.feedCategories && item.feedCategories.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`${NEWS_OVERVIEW_RSS_TAG_LABEL} (filter)`}>
            {item.feedCategories.slice(0, NEWS_OVERVIEW_MAX_RSS_SECTION_CHIPS_PER_CARD).map((fc) => {
              const chipOn = tagFilter?.kind === 'fc' && tagFilter.value === fc
              return (
                <button
                  key={`card-${domSuf}-${fc}`}
                  type="button"
                  onClick={() => onToggleFeedCategoryFacet(fc)}
                  className={`max-w-full truncate rounded-md px-2 py-0.5 text-left text-[10px] font-medium transition-colors ${
                    chipOn ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'bg-slate-100 text-slate-800 ring-1 ring-slate-200/90 hover:bg-slate-200/80'
                  }`}
                  title={`Tag: ${fc}`}
                >
                  {fc}
                </button>
              )
            })}
          </div>
        ) : null}
        <p className="mt-1.5 text-[11px] text-gray-500">
          {item.sourceLabel}
          {when ? ` · ${when}` : ''}
        </p>
        {also.length > 0 ? (
          <div
            className="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-[10px] leading-snug text-gray-500"
            role="group"
            aria-label="Same story, other outlets (merged by link or same-day title)"
          >
            <span className="shrink-0 font-medium text-gray-400">Also</span>
            {also.map((ref, j) => {
              const matchesFacet = facetSrcId !== null && ref.sourceId === facetSrcId
              const inner = <span className={matchesFacet ? 'font-semibold text-violet-700' : undefined}>{ref.sourceLabel}</span>
              return (
                <span key={`${ref.sourceId}-${j}`} className="inline-flex min-w-0 items-baseline gap-1">
                  {j > 0 ? (
                    <span className="text-gray-300" aria-hidden>
                      {'\u00b7'}
                    </span>
                  ) : null}
                  {ref.href ? (
                    <a
                      href={ref.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`min-w-0 truncate underline-offset-2 hover:underline ${matchesFacet ? 'text-violet-700' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </span>
              )
            })}
          </div>
        ) : null}
        <div className="mt-2">
          <p
            id={`news-summary-body-${domSuf}`}
            className={`break-words text-[13px] leading-relaxed text-gray-600 [overflow-wrap:anywhere] ${summaryNeedsExpand && !summaryExpanded ? 'line-clamp-6' : ''}`}
          >
            {fallbackDesc}
          </p>
          {summaryNeedsExpand ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              className="mt-1.5 justify-start"
              aria-expanded={summaryExpanded}
              aria-controls={`news-summary-body-${domSuf}`}
              id={`news-summary-toggle-${domSuf}`}
              onClick={() => onToggleSummaryByRowKey(rowKey)}
            >
              {summaryExpanded ? '收起' : '展开'}
            </Button>
          ) : null}
        </div>
      </article>
    </li>
  )
}
