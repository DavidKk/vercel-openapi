'use server'

import { validateCookie } from '@/services/auth/access'
import { getGistInfo, readGistFile, writeGistFile } from '@/services/gist'
import { validateUnit } from '@/utils/validation'

export interface ProductType {
  id: string
  name: string
  unit: string
  unitBestPrice: number
  brand?: string
  unitConversions?: string[]
  remark?: string
}

const PRODUCTS_FILE_NAME = 'products.json'

/**
 * Reads all products from gist storage.
 * @returns Product list from gist
 */
async function getProductsFromGist(): Promise<ProductType[]> {
  try {
    const { gistId, gistToken } = getGistInfo()
    const content = await readGistFile({ gistId, gistToken, fileName: PRODUCTS_FILE_NAME })
    return JSON.parse(content) as ProductType[]
  } catch {
    return []
  }
}

/**
 * Persists products into gist storage.
 * @param products Products to save
 * @returns Promise resolved when save completes
 */
async function saveProductsToGist(products: ProductType[]): Promise<void> {
  const { gistId, gistToken } = getGistInfo()
  const content = JSON.stringify(products, null, 2)
  await writeGistFile({ gistId, gistToken, fileName: PRODUCTS_FILE_NAME, content })
}

/**
 * Gets all products for overview usage.
 * @returns Product list
 */
export async function getAllProducts(): Promise<ProductType[]> {
  return getProductsFromGist()
}

/**
 * Creates a product.
 * @param product Product payload without id
 * @returns Created product
 */
export async function createProduct(product: Omit<ProductType, 'id'>): Promise<ProductType> {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  const validUnit = validateUnit(product.unit)
  if (validUnit !== true) {
    throw new Error(validUnit)
  }

  const products = await getProductsFromGist()
  const duplicated = products.find((item) => item.name === product.name && (item.brand ?? '') === (product.brand ?? ''))
  if (duplicated) {
    throw new Error(`Product "${product.name}" with brand "${product.brand ?? ''}" already exists`)
  }

  const sameName = products.find((item) => item.name === product.name)
  if (sameName && sameName.unit !== product.unit) {
    throw new Error(`Product "${product.name}" already exists with unit "${sameName.unit}", can not create with "${product.unit}"`)
  }

  const maxId = products.length > 0 ? Math.max(...products.map((item) => Number(item.id) || 0)) : -1
  const created: ProductType = {
    ...product,
    id: String(maxId + 1),
  }
  products.push(created)
  await saveProductsToGist(products)
  return created
}

/**
 * Updates a product by id.
 * @param id Product id
 * @param updates Partial update payload
 * @returns Updated product or null if absent
 */
export async function updateProduct(id: string, updates: Partial<ProductType>): Promise<ProductType | null> {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  if (updates.unit) {
    const validUnit = validateUnit(updates.unit)
    if (validUnit !== true) {
      throw new Error(validUnit)
    }
  }

  const products = await getProductsFromGist()
  const index = products.findIndex((item) => item.id === id)
  if (index < 0) {
    return null
  }

  const merged = { ...products[index], ...updates }
  const duplicated = products.find((item) => item.id !== id && item.name === merged.name && (item.brand ?? '') === (merged.brand ?? ''))
  if (duplicated) {
    throw new Error(`Product "${merged.name}" with brand "${merged.brand ?? ''}" already exists`)
  }

  const sameName = products.find((item) => item.id !== id && item.name === merged.name)
  if (sameName && sameName.unit !== merged.unit) {
    throw new Error(`Product "${merged.name}" already exists with unit "${sameName.unit}", can not update to "${merged.unit}"`)
  }

  products[index] = merged
  await saveProductsToGist(products)
  return merged
}

/**
 * Deletes product by id.
 * @param id Product id
 * @returns Whether product existed and was deleted
 */
export async function deleteProduct(id: string): Promise<boolean> {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  const products = await getProductsFromGist()
  const nextProducts = products.filter((item) => item.id !== id)
  if (nextProducts.length === products.length) {
    return false
  }

  await saveProductsToGist(nextProducts)
  return true
}
