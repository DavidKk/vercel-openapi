import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { createLogger } from '@/services/logger'
import { isValidNewsCategory } from '@/services/news/sources'

import { NewsOverview } from '../components'

const logger = createLogger('news-category-page')

interface NewsCategoryPageProps {
  params: Promise<{ category: string }>
}

/**
 * News feed for one manifest category (`/news/[category]`); facets come from search params (`tag`, `keyword`, `source`).
 */
export default async function NewsCategoryPage(props: Readonly<NewsCategoryPageProps>) {
  const { category } = await props.params
  if (!isValidNewsCategory(category)) {
    notFound()
  }

  const categorySummary = `News: SSR page /news/${category} (overview shell)`
  logger.info(
    categorySummary,
    JSON.stringify({
      flow: 'Page /news/[category]',
      step: 'render',
      message: categorySummary,
      event: 'news_category_page',
      category,
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
