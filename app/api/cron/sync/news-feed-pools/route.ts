import { cron } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import { getNewsCategoryForListSlug, NEWS_LIST_SLUGS_ORDER } from '@/services/news/config/news-subcategories'
import { buildNewsFeedPoolCacheKey, refreshNewsFeedMergedPool, resolveNewsFeedPoolRecentWindowHours } from '@/services/news/feed/feed-kv-cache'
import { filterNewsSources, getNewsFeedBaseUrl, isValidNewsCategory, isValidNewsRegion, NEWS_MANIFEST_CATEGORY_ORDER } from '@/services/news/sources/sources'
import type { NewsCategory } from '@/services/news/types'

export const runtime = 'nodejs'

/**
 * Vercel Hobby allows `maxDuration` 1–60s only. Pro/Enterprise can raise this in code (e.g. 300) per route.
 * @see https://vercel.com/docs/functions/configuring-functions/duration
 */
export const maxDuration = 60

const logger = createLogger('cron-news-feed-pools')

const DEFAULT_MAX_FEEDS = 15
const MAX_MAX_FEEDS = 25
const POSITIVE_INT_RE = /^\d+$/

/**
 * Parse positive int in range; fall back to default when missing.
 * @param raw Query value or null
 * @param defaultValue Default when absent
 * @param max Upper bound inclusive
 * @returns Value or null if present but invalid
 */
function parseBoundedInt(raw: string | null, defaultValue: number, max: number): number | null {
  if (raw === null || raw === '') {
    return defaultValue
  }
  const trimmed = raw.trim()
  if (!POSITIVE_INT_RE.test(trimmed)) {
    return null
  }
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n) || n < 1) {
    return null
  }
  return Math.min(max, n)
}

interface PoolRefreshJob {
  categoryKey: string
  itemCategory?: NewsCategory
  /** Manifest list sub-tab slug; empty for all-pool job */
  subcategory: string
}

/**
 * News merged-pool warm / refresh cron. Re-fetches RSS and writes L1 + Upstash for each pool key
 * (same RSS merge + L1/KV write as a full pool refresh). Call from cron-job.org etc. every ~10 minutes with
 * `CRON_SECRET` (Bearer or `?secret=`).
 *
 * Query: `maxFeeds` (default 15, max 25), `region` (`cn` | `hk_tw` | `intl` or omit for all),
 * `categories` (comma-separated slugs; default all manifest tabs), `allPool=1` to also refresh the
 * no-category pool key used when `category` is omitted on the API.
 * Each selected manifest category runs **one refresh per flat list slug** under that category, matching `GET /api/news/feed?list=`.
 */
export const GET = cron(async (_req, context) => {
  const maxFeeds = parseBoundedInt(context.searchParams.get('maxFeeds'), DEFAULT_MAX_FEEDS, MAX_MAX_FEEDS)
  if (maxFeeds === null) {
    return jsonInvalidParameters('invalid maxFeeds', { headers: cacheControlNoStoreHeaders() })
  }

  const regionRaw = context.searchParams.get('region')?.trim() ?? ''
  const regionNorm = regionRaw !== '' && isValidNewsRegion(regionRaw) ? regionRaw : ''
  if (regionRaw !== '' && regionNorm === '') {
    return jsonInvalidParameters('invalid region', { headers: cacheControlNoStoreHeaders() })
  }

  const catParam = context.searchParams.get('categories')?.trim()
  let categories: NewsCategory[]
  if (!catParam) {
    categories = [...NEWS_MANIFEST_CATEGORY_ORDER]
  } else {
    categories = catParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s): s is NewsCategory => isValidNewsCategory(s))
    if (categories.length === 0) {
      return jsonInvalidParameters('invalid categories (comma-separated manifest category slugs)', {
        headers: cacheControlNoStoreHeaders(),
      })
    }
  }

  const includeAllPool = context.searchParams.get('allPool') === '1'

  const baseUrl = getNewsFeedBaseUrl()
  const allSources = filterNewsSources(undefined, regionNorm || undefined)
  if (allSources.length === 0) {
    return jsonInvalidParameters('no sources for given region', { headers: cacheControlNoStoreHeaders() })
  }

  const jobs: PoolRefreshJob[] = []
  if (includeAllPool) {
    jobs.push({ categoryKey: '', itemCategory: undefined, subcategory: '' })
  }
  for (const c of categories) {
    for (const slug of NEWS_LIST_SLUGS_ORDER) {
      if (getNewsCategoryForListSlug(slug) !== c) {
        continue
      }
      jobs.push({ categoryKey: c, itemCategory: c, subcategory: slug })
    }
  }

  const startedAt = Date.now()
  logger.info(`news-feed-pools cron start (${jobs.length} jobs, maxFeeds=${maxFeeds}, region=${regionNorm || 'all'})`)

  const settled = await Promise.allSettled(
    jobs.map(async (job) => {
      const sources = filterNewsSources(job.itemCategory, regionNorm || undefined, job.itemCategory !== undefined ? job.subcategory : undefined).slice(0, maxFeeds)
      const recentWindowHours = resolveNewsFeedPoolRecentWindowHours(job.subcategory)
      const poolCacheKey = await buildNewsFeedPoolCacheKey({
        baseUrl,
        category: job.categoryKey,
        subcategory: job.subcategory,
        region: regionNorm,
        maxFeeds,
        recentWindowHours,
      })
      const t0 = Date.now()
      await refreshNewsFeedMergedPool({
        poolCacheKey,
        sources,
        baseUrl,
        itemCategory: job.itemCategory,
        listSlug: job.subcategory,
      })
      const ms = Date.now() - t0
      return {
        categoryKey: job.categoryKey || 'all',
        itemCategory: job.itemCategory ?? null,
        subcategory: job.subcategory || null,
        ms,
      }
    })
  )

  const ok: { categoryKey: string; itemCategory: string | null; subcategory: string | null; ms: number }[] = []
  const failed: { categoryKey: string; reason: string }[] = []

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]!
    const job = jobs[i]!
    const label = job.categoryKey || 'all'
    if (s.status === 'fulfilled') {
      ok.push({
        categoryKey: s.value.categoryKey,
        itemCategory: s.value.itemCategory,
        subcategory: s.value.subcategory,
        ms: s.value.ms,
      })
    } else {
      const reason = s.reason instanceof Error ? s.reason.message : String(s.reason)
      failed.push({ categoryKey: label, reason })
    }
  }

  const totalMs = Date.now() - startedAt
  logger.info(`news-feed-pools cron done ok=${ok.length} failed=${failed.length} ${totalMs}ms`, JSON.stringify({ ok, failed }))

  return jsonSuccess(
    {
      ok: failed.length === 0,
      refreshed: ok,
      failures: failed,
      jobCount: jobs.length,
      durationMs: totalMs,
      maxFeeds,
      region: regionNorm || 'all',
    },
    { headers: cacheControlNoStoreHeaders() }
  )
})
