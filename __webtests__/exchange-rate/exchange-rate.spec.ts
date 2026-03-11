import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/** Top (from) amount input - placeholder is "0" */
function topInput(page: Page) {
  return page.getByTestId('converter-row-from').getByPlaceholder('0')
}

/** Bottom (to) amount input */
function bottomInput(page: Page) {
  return page.getByTestId('converter-row-to').getByPlaceholder('0')
}

/** Open from-currency dropdown and select option by label (e.g. "EUR") */
async function selectFromCurrency(page: Page, currency: string) {
  await page.getByTestId('converter-row-from').getByRole('button').click()
  await page.getByTestId('currency-options-list').getByRole('button', { name: currency }).click()
}

/** Open to-currency dropdown and select option by label */
async function selectToCurrency(page: Page, currency: string) {
  await page.getByTestId('converter-row-to').getByRole('button').click()
  await page.getByTestId('currency-options-list').getByRole('button', { name: currency }).click()
}

test.describe('Exchange Rate Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exchange-rate')
  })

  test('should display the page title', async ({ page }) => {
    await expect(page.getByText('Exchange rates', { exact: true })).toBeVisible()
  })

  test('should display currency converter with default values', async ({ page }) => {
    await expect(topInput(page)).toBeVisible()
    await expect(topInput(page)).toHaveValue('100')
    await expect(page.getByTestId('converter-row-from').getByRole('button')).toHaveText('USD')
    await expect(page.getByTestId('converter-row-to').getByRole('button')).toHaveText('CNY')
  })

  test('should convert currencies when entering amount in top input', async ({ page }) => {
    await expect(topInput(page)).toBeVisible({ timeout: 10000 })
    await topInput(page).fill('50')
    await selectFromCurrency(page, 'USD')
    await selectToCurrency(page, 'CNY')
    await expect(bottomInput(page)).not.toHaveValue('')
  })

  test('should convert currencies when entering amount in bottom input', async ({ page }) => {
    await expect(bottomInput(page)).toBeVisible({ timeout: 10000 })
    await bottomInput(page).fill('350')
    await expect(topInput(page)).not.toHaveValue('')
  })

  test('should switch currencies and convert correctly', async ({ page }) => {
    await selectFromCurrency(page, 'EUR')
    await selectToCurrency(page, 'USD')
    await topInput(page).fill('100')
    await expect(bottomInput(page)).not.toHaveValue('')
  })

  test('should handle same currency conversion', async ({ page }) => {
    await selectFromCurrency(page, 'USD')
    await selectToCurrency(page, 'USD')
    await topInput(page).fill('100')
    await expect(bottomInput(page)).toHaveValue('100')
  })

  test('should handle decimal inputs correctly', async ({ page }) => {
    await topInput(page).fill('99.99')
    await expect(bottomInput(page)).not.toHaveValue('')
  })

  test('should handle zero input correctly', async ({ page }) => {
    await topInput(page).fill('0')
    await expect(bottomInput(page)).toBeVisible()
  })

  test('should handle empty input correctly', async ({ page }) => {
    await topInput(page).fill('')
    await expect(bottomInput(page)).toBeVisible()
  })

  test('should update conversion when changing from currency', async ({ page }) => {
    await topInput(page).fill('100')
    await selectFromCurrency(page, 'EUR')
    await expect(bottomInput(page)).not.toHaveValue('')
  })

  test('should update conversion when changing to currency', async ({ page }) => {
    await topInput(page).fill('100')
    await selectToCurrency(page, 'EUR')
    await expect(bottomInput(page)).not.toHaveValue('')
  })
})
