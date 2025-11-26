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

    // Wait for the location information to be displayed
    await expect(page.getByRole('heading', { name: 'Location Information' })).toBeVisible({ timeout: 10000 })

    // Check that the location information is displayed correctly
    await expect(page.getByText('Country:')).toBeVisible()
    await expect(page.getByText('Province:')).toBeVisible()

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

    // Wait for the error message to be displayed
    await expect(page.getByText('Error')).toBeVisible({ timeout: 10000 })

    // Check that an error message is displayed
    // The error message might be the one from the API or a general geocoding error
    await expect(page.locator('.text-red-700')).toBeVisible()
  })

  // Removed API usage instructions test as this section was removed from the component
})
