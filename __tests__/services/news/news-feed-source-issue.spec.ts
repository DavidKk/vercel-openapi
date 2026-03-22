import { NEWS_FEED_MERGE_BUDGET_SKIP_PHRASE } from '@/services/news/feed/aggregate-feed'
import { classifyNewsFeedSourceIssueMessage, splitNewsFeedPoolErrors } from '@/services/news/feed/news-feed-source-issue'

describe('news-feed-source-issue', () => {
  it('should classify timeout and merge budget as warming', () => {
    expect(classifyNewsFeedSourceIssueMessage('timeout after 30000ms (help)')).toBe('warming')
    expect(classifyNewsFeedSourceIssueMessage(`skipped: ${NEWS_FEED_MERGE_BUDGET_SKIP_PHRASE}`)).toBe('warming')
    expect(classifyNewsFeedSourceIssueMessage('RSS fetch exhausted retries')).toBe('warming')
  })

  it('should classify 502/503/504/429 as warming and 403/500 as failure', () => {
    expect(classifyNewsFeedSourceIssueMessage('HTTP 503')).toBe('warming')
    expect(classifyNewsFeedSourceIssueMessage('HTTP 502')).toBe('warming')
    expect(classifyNewsFeedSourceIssueMessage('HTTP 504')).toBe('warming')
    expect(classifyNewsFeedSourceIssueMessage('HTTP 429')).toBe('warming')
    expect(classifyNewsFeedSourceIssueMessage('HTTP 403')).toBe('failure')
    expect(classifyNewsFeedSourceIssueMessage('HTTP 500')).toBe('failure')
    expect(classifyNewsFeedSourceIssueMessage('HTTP 404')).toBe('failure')
  })

  it('should split pooled errors into warmup vs failures', () => {
    const { warmup, failures } = splitNewsFeedPoolErrors([
      { sourceId: 'a', message: 'HTTP 500' },
      { sourceId: 'b', message: 'timeout after 1000ms' },
    ])
    expect(failures.map((e) => e.sourceId)).toEqual(['a'])
    expect(warmup.map((e) => e.sourceId)).toEqual(['b'])
  })
})
