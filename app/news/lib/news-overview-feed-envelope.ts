import type { AggregatedNewsItem, NewsFeedFacets, NewsFeedSourceInventoryRow } from '@/services/news/types'

/**
 * Loose JSON envelope shape for `GET /api/news/feed` responses parsed on the client.
 */
export interface NewsOverviewFeedEnvelope {
  code?: number
  message?: string
  data?: {
    items?: AggregatedNewsItem[]
    errors?: { sourceId: string; message: string }[]
    feedWarmup?: {
      pending?: boolean
      sources?: { sourceId: string; message: string }[]
    }
    fetchedAt?: string
    mergeStats?: {
      hasMore?: boolean
      uniqueAfterDedupe?: number
      sourcesRequested?: number
      sourcesWithItems?: number
    }
    facets?: NewsFeedFacets
    sourceInventory?: NewsFeedSourceInventoryRow[]
  }
}
