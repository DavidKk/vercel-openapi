import { mergeNewsFeedsToPool, NEWS_FEED_MERGE_BUDGET_SKIP_PHRASE, resolveNewsFeedMergeWallDeadlineMs } from '@/services/news/feed/aggregate-feed'
import type { NewsSourceConfig } from '@/services/news/types'

const wallTestSources: NewsSourceConfig[] = [
  {
    id: 'wall-a',
    label: 'A',
    category: 'general-news',
    subcategory: 'headlines',
    region: 'cn',
    rsshubPath: '/a',
  },
  {
    id: 'wall-b',
    label: 'B',
    category: 'general-news',
    subcategory: 'headlines',
    region: 'cn',
    rsshubPath: '/b',
  },
]

describe('news feed merge wall deadline', () => {
  const envKeys = ['NEWS_FEED_MERGE_WALL_MS', 'VERCEL'] as const
  const savedEnv: Partial<Record<(typeof envKeys)[number], string | undefined>> = {}

  beforeEach(() => {
    for (const k of envKeys) {
      savedEnv[k] = process.env[k]
    }
  })

  afterEach(() => {
    for (const k of envKeys) {
      const v = savedEnv[k]
      if (v === undefined) {
        delete process.env[k]
      } else {
        process.env[k] = v
      }
    }
  })

  it('should skip every source when merge wall deadline is already in the past', async () => {
    const merged = await mergeNewsFeedsToPool(wallTestSources, 'https://rss.example.test', {
      windowAtMs: Date.now(),
      mergeWallDeadlineMs: Date.now() - 1,
    })
    expect(merged.pool).toHaveLength(0)
    expect(merged.errors).toHaveLength(wallTestSources.length)
    expect(merged.errors.every((e) => e.message.includes(NEWS_FEED_MERGE_BUDGET_SKIP_PHRASE))).toBe(true)
  })

  it('should return undefined deadline when NEWS_FEED_MERGE_WALL_MS disables the cap', () => {
    process.env.NEWS_FEED_MERGE_WALL_MS = '0'
    delete process.env.VERCEL
    expect(resolveNewsFeedMergeWallDeadlineMs()).toBeUndefined()
  })

  it('should return a near-future deadline on Vercel when NEWS_FEED_MERGE_WALL_MS is unset', () => {
    delete process.env.NEWS_FEED_MERGE_WALL_MS
    process.env.VERCEL = '1'
    const deadline = resolveNewsFeedMergeWallDeadlineMs()
    expect(deadline).toBeDefined()
    const skew = deadline! - Date.now()
    expect(skew).toBeGreaterThan(0)
    expect(skew).toBeLessThanOrEqual(9500)
  })

  it('should use NEWS_FEED_MERGE_WALL_MS as budget from now when set positive', () => {
    process.env.NEWS_FEED_MERGE_WALL_MS = '5000'
    delete process.env.VERCEL
    const before = Date.now()
    const deadline = resolveNewsFeedMergeWallDeadlineMs()
    expect(deadline).toBeDefined()
    const skew = deadline! - before
    expect(skew).toBeGreaterThanOrEqual(4990)
    expect(skew).toBeLessThanOrEqual(5100)
  })
})
