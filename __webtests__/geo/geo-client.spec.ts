import { expect, test } from '@playwright/test'

test.describe('GeoClient Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/geo')
  })

  test('should auto-request location and show map or placeholder or error', async ({ page }) => {
    const loadingOrPlaceholderOrError = page.getByText(/Getting location|Map will appear|Location access was denied|This area is not supported/)
    const map = page.getByRole('img', { name: /Region boundary/ })
    await expect(loadingOrPlaceholderOrError.or(map).first()).toBeVisible({ timeout: 8000 })
  })

  test('should show map and district when location is allowed', async ({ page, context }) => {
    const mockData = {
      province: 'Guangdong',
      city: 'Guangzhou',
      district: 'Tianhe',
      latitude: 22.96055374923791,
      longitude: 113.11020894852696,
      polygon: '113.1 22.96,113.11 22.96,113.11 22.97,113.1 22.97,113.1 22.96',
    }
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 22.96055374923791, longitude: 113.11020894852696 })

    await page.route('**/api/geo?*', (route) => {
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'ok', data: mockData }),
      })
    })

    await page.goto('/geo')

    await expect(page.getByText('Tianhe').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Guangdong').first()).toBeVisible({ timeout: 5000 })
  })

  test('should display error when location is not supported by API', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 })

    await page.route('**/api/geo?*', (route) => {
      void route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'This area is not supported for this service.' }),
      })
    })

    await page.goto('/geo')

    const errorContainer = page.getByTestId('geocode-api-error').or(page.getByTestId('geocode-error'))
    await expect(errorContainer.first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/not supported for this service/)).toBeVisible({ timeout: 5000 })
  })
})
