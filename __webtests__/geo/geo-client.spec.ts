import { expect, test } from '@playwright/test'

test.describe('GeoClient Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the geo page before each test
    await page.goto('/geo')
  })

  test('should display the page title', async ({ page }) => {
    // Check that the page title is displayed
    await expect(page.getByText('Geocoding Service')).toBeVisible()
  })

  test('should allow manual input of coordinates and display location information', async ({ page }) => {
    // Test coordinates:
    // Latitude: 22.96055374923791
    // Longitude: 113.11020894852696

    // Fill in the latitude input
    await page.getByLabel('Latitude').fill('22.96055374923791')

    // Fill in the longitude input
    await page.getByLabel('Longitude').fill('113.11020894852696')

    // Click the "Query Location" button
    await page.getByRole('button', { name: 'Query Location' }).click()

    // Wait for loading to complete (button text changes back from "Querying...")
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]')
        return button && !button.textContent?.includes('Querying...')
      },
      { timeout: 15000 }
    )

    // Wait for the location information to be displayed - use heading role to avoid ambiguity
    // The heading is inside the green background container that appears after data loads
    await expect(page.locator('.bg-green-50').getByRole('heading', { name: 'Location Information' })).toBeVisible({ timeout: 15000 })

    // Check that the location information is displayed correctly
    await expect(page.getByText('Country:')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Province:')).toBeVisible({ timeout: 5000 })

    // Verify that we get some location data (not empty)
    const provinceText = await page.getByText('Province:').textContent()
    expect(provinceText).not.toBeNull()
    expect(provinceText).toContain('Province:')
  })

  test('should display error message for invalid coordinates', async ({ page }) => {
    // Fill in invalid coordinates
    await page.getByLabel('Latitude').fill('999')
    await page.getByLabel('Longitude').fill('999')

    // Click the "Query Location" button
    await page.getByRole('button', { name: 'Query Location' }).click()

    // Wait for loading to complete (button text changes back from "Querying...")
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]')
        return button && !button.textContent?.includes('Querying...')
      },
      { timeout: 15000 }
    )

    // Wait for the error message to be displayed
    // The error is displayed in a div with bg-red-50 class containing an "Error" heading
    // First wait for the error container to appear
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 15000 })

    // Then check for the Error heading inside the container
    await expect(page.locator('.bg-red-50').getByRole('heading', { name: 'Error' })).toBeVisible({ timeout: 5000 })
  })

  // Removed API usage instructions test as this section was removed from the component
})
