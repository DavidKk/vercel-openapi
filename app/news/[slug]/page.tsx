import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createLogger } from '@/services/logger'
import { getDefaultNewsSubcategory, isValidNewsListSlug, isValidNewsSubcategoryForCategory } from '@/services/news/news-subcategories'
import { isValidNewsCategory } from '@/services/news/sources'
import type { NewsCategory } from '@/services/news/types'

import { NewsOverview } from '../components'

const logger = createLogger('news-list-page')

interface NewsListPageProps {
  /** Path segment after `/news/` (flat list key, e.g. `headlines`). Named `slug` to avoid Next.js param name clashes with `list`. */
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * First non-empty string from Next.js search param value.
 * @param v Raw param
 * @returns Trimmed string or undefined
 */
function firstSearchParamString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) {
    return undefined
  }
  const s = Array.isArray(v) ? v[0] : v
  const t = s?.trim()
  return t === '' ? undefined : t
}

/**
 * News feed for one flat list (`/news/[slug]`); facets use `tag`, `keyword`, `source`. Legacy `/news/[oldCategory]?sub=` redirects here.
 */
export default async function NewsListPage(props: Readonly<NewsListPageProps>) {
  const p = await props.params
  const listSegment = (typeof p.slug === 'string' ? p.slug : '').trim()
  const sp = await props.searchParams

  if (listSegment === 'depth') {
    const q = new URLSearchParams()
    for (const key of ['tag', 'keyword', 'source'] as const) {
      const v = firstSearchParamString(sp[key])
      if (v) {
        q.set(key, v)
      }
    }
    const tail = q.toString()
    redirect(tail ? `/news/headlines?${tail}` : '/news/headlines')
  }

  if (!isValidNewsListSlug(listSegment)) {
    if (isValidNewsCategory(listSegment)) {
      const cat = listSegment as NewsCategory
      const subQ = firstSearchParamString(sp.sub)
      const mapped = subQ && isValidNewsSubcategoryForCategory(cat, subQ) ? subQ : getDefaultNewsSubcategory(cat)
      const q = new URLSearchParams()
      for (const key of ['tag', 'keyword', 'source'] as const) {
        const v = firstSearchParamString(sp[key])
        if (v) {
          q.set(key, v)
        }
      }
      const tail = q.toString()
      redirect(tail ? `/news/${mapped}?${tail}` : `/news/${mapped}`)
    }
    notFound()
  }

  const listSummary = `News: SSR page /news/${listSegment} (overview shell)`
  logger.info(
    listSummary,
    JSON.stringify({
      flow: 'Page /news/[slug]',
      step: 'render',
      message: listSummary,
      event: 'news_list_page',
      list: listSegment,
    })
  )

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-gray-50 text-sm text-gray-400" aria-busy="true">
          …
        </div>
      }
    >
      <NewsOverview />
    </Suspense>
  )
}
