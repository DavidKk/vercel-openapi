import { expect, test } from '@playwright/test'

test.describe('GeoClient Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the geo page before each test
    await page.goto('/geo')
  })

  test('should display the page title', async ({ page }) => {
    // Geo overview page shows the geocode form; check for the main action button
    await expect(page.getByRole('button', { name: 'Query location' })).toBeVisible()
  })

  test('should allow manual input of coordinates and display location information', async ({ page }) => {
    // Test coordinates:
    // Latitude: 22.96055374923791
    // Longitude: 113.11020894852696

    // Fill in the latitude input
    await page.getByLabel('Latitude').fill('22.96055374923791')

    // Fill in the longitude input
    await page.getByLabel('Longitude').fill('113.11020894852696')

    // Click the "Query location" button
    await page.getByRole('button', { name: 'Query location' }).click()

    // Wait for loading to complete (button text changes back from "Querying…")
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]')
        return button && !button.textContent?.includes('Querying')
      },
      { timeout: 15000 }
    )

    // Wait for the location information (GeoClient uses .bg-gray-50 and label "Location")
    await expect(page.locator('.bg-gray-50').getByText('Location')).toBeVisible({ timeout: 15000 })

    // Check that the location information is displayed correctly (dt labels: Country, Province)
    await expect(page.getByText('Country', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Province', { exact: true }).first()).toBeVisible({ timeout: 5000 })
  })

  test('should display error message for invalid coordinates', async ({ page }) => {
    // Fill in invalid coordinates
    await page.getByLabel('Latitude').fill('999')
    await page.getByLabel('Longitude').fill('999')

    // Click the "Query location" button
    await page.getByRole('button', { name: 'Query location' }).click()

    // Wait for loading to complete (button text changes back from "Querying…")
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]')
        return button && !button.textContent?.includes('Querying')
      },
      { timeout: 15000 }
    )

    // Wait for the error message (GeoClient uses data-testid="geocode-error" and "Error: " prefix)
    const errorContainer = page.getByTestId('geocode-error')
    await expect(errorContainer).toBeVisible({ timeout: 15000 })
    await expect(errorContainer.getByText(/Error/)).toBeVisible({ timeout: 5000 })
  })

  // Removed API usage instructions test as this section was removed from the component
})
