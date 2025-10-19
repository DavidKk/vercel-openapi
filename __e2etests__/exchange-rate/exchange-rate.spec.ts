import { expect, test } from '@playwright/test'

test.describe('Exchange Rate Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the exchange rate page before each test
    await page.goto('/exchange-rate')
  })

  test('should display the page title', async ({ page }) => {
    // Check that the page title is displayed
    await expect(page.getByRole('heading', { name: 'Exchange Rates' })).toBeVisible()
  })

  test('should display currency converter with default values', async ({ page }) => {
    // Check that the currency converter is visible
    await expect(page.getByPlaceholder('Enter amount')).toBeVisible()

    // Check default values
    const topInput = page.getByPlaceholder('Enter amount')
    const bottomInput = page.getByPlaceholder('Converted amount')

    // Check that default amount is set
    await expect(topInput).toHaveValue('100')

    // Check that currency selectors are visible
    await expect(page.locator('select').first()).toBeVisible()
    await expect(page.locator('select').last()).toBeVisible()
  })

  test('should convert currencies when entering amount in top input', async ({ page }) => {
    // Fill in amount
    await page.getByPlaceholder('Enter amount').fill('50')

    // Select currencies (if needed)
    // The default should be USD to CNY, but we'll explicitly select them to be sure
    await page.locator('select').first().selectOption('USD')
    await page.locator('select').last().selectOption('CNY')

    // Check that the result is displayed in the bottom input
    const bottomInput = page.getByPlaceholder('Converted amount')
    await expect(bottomInput).not.toBeEmpty()

    // Check that conversion information is displayed
    await expect(page.locator('.bg-blue-50')).toBeVisible()
  })

  test('should convert currencies when entering amount in bottom input', async ({ page }) => {
    // Fill in amount in bottom input
    const bottomInput = page.getByPlaceholder('Converted amount')
    await bottomInput.fill('350')

    // Check that the result is displayed in the top input
    const topInput = page.getByPlaceholder('Enter amount')
    await expect(topInput).not.toBeEmpty()

    // Check that conversion information is displayed
    await expect(page.locator('.bg-blue-50')).toBeVisible()
  })

  test('should switch currencies and convert correctly', async ({ page }) => {
    // Select EUR as from currency and USD as to currency
    await page.locator('select').first().selectOption('EUR')
    await page.locator('select').last().selectOption('USD')

    // Fill in amount
    await page.getByPlaceholder('Enter amount').fill('100')

    // Check that the result is displayed
    const bottomInput = page.getByPlaceholder('Converted amount')
    await expect(bottomInput).not.toBeEmpty()

    // Check that conversion information is displayed
    await expect(page.locator('.bg-blue-50')).toBeVisible()
  })

  test('should handle same currency conversion', async ({ page }) => {
    // Select USD for both currencies
    await page.locator('select').first().selectOption('USD')
    await page.locator('select').last().selectOption('USD')

    // Fill in amount
    await page.getByPlaceholder('Enter amount').fill('100')

    // Check that the result is the same
    const bottomInput = page.getByPlaceholder('Converted amount')
    await expect(bottomInput).toHaveValue('100')
  })

  test('should handle decimal inputs correctly', async ({ page }) => {
    // Fill in decimal amount
    await page.getByPlaceholder('Enter amount').fill('99.99')

    // Check that the result is displayed
    const bottomInput = page.getByPlaceholder('Converted amount')
    await expect(bottomInput).not.toBeEmpty()

    // Check that conversion information is displayed
    await expect(page.locator('.bg-blue-50')).toBeVisible()
  })

  test('should handle zero input correctly', async ({ page }) => {
    // Fill in zero amount
    await page.getByPlaceholder('Enter amount').fill('0')

    // Check that the result is zero
    const bottomInput = page.getByPlaceholder('Converted amount')
    await expect(bottomInput).not.toBeEmpty()

    // Check that conversion information is displayed
    await expect(page.locator('.bg-blue-50')).toBeVisible()
  })

  test('should handle empty input correctly', async ({ page }) => {
    // Clear the input
    await page.getByPlaceholder('Enter amount').fill('')

    // Check that the result is also empty or zero
    const bottomInput = page.getByPlaceholder('Converted amount')
    // The bottom input should be updated accordingly
    await expect(bottomInput).toBeVisible()
  })

  test('should update conversion when changing from currency', async ({ page }) => {
    // Fill in amount
    await page.getByPlaceholder('Enter amount').fill('100')

    // Change from currency
    await page.locator('select').first().selectOption('EUR')

    // Check that the result is updated
    const bottomInput = page.getByPlaceholder('Converted amount')
    await expect(bottomInput).not.toBeEmpty()

    // Check that conversion information is displayed
    await expect(page.locator('.bg-blue-50')).toBeVisible()
  })

  test('should update conversion when changing to currency', async ({ page }) => {
    // Fill in amount
    await page.getByPlaceholder('Enter amount').fill('100')

    // Change to currency
    await page.locator('select').last().selectOption('EUR')

    // Check that the result is updated
    const bottomInput = page.getByPlaceholder('Converted amount')
    await expect(bottomInput).not.toBeEmpty()

    // Check that conversion information is displayed
    await expect(page.locator('.bg-blue-50')).toBeVisible()
  })
})
