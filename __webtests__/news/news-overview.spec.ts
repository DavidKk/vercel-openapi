import { expect, test } from '@playwright/test'

test.describe('News overview /news/[category]', () => {
  test('should load overview shell and show feed after mocked API', async ({ page }) => {
    await page.route('**/api/news/feed**', async (route) => {
      const body = {
        code: 0,
        message: 'ok',
        data: {
          items: [
            {
              title: 'E2E mock headline',
              link: 'https://example.com/e2e',
              publishedAt: new Date().toISOString(),
              summary: '<p>Summary</p>',
              sourceId: 'mock',
              sourceLabel: 'Mock',
              category: 'general-news',
              region: 'cn',
            },
          ],
          fetchedAt: new Date().toISOString(),
          baseUrl: 'https://rsshub.app',
          mergeStats: {
            sourcesRequested: 1,
            sourcesWithItems: 1,
            sourcesEmptyOrFailed: 0,
            rawItemCount: 1,
            droppedMissingLink: 0,
            duplicateDropped: 0,
            duplicateDroppedByTitle: 0,
            droppedOutsideRecentWindow: 0,
            recentWindowHours: 24,
            uniqueAfterDedupe: 1,
            offset: 0,
            hasMore: false,
            returnedItems: 1,
            truncatedByLimit: 0,
          },
          facets: { categories: [], keywords: [], sources: [] },
        },
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(body),
      })
    })

    await page.goto('/news/general-news')

    await expect(page.getByRole('heading', { name: 'News' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('E2E mock headline')).toBeVisible({ timeout: 15_000 })
  })
})
