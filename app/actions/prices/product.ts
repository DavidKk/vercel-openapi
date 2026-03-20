'use server'

import { validateCookie } from '@/services/auth/access'
import { getJsonKv, setJsonKv } from '@/services/kv/client'
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

const PRODUCTS_KV_KEY = 'prices:products'

/**
 * Reads all products from KV storage.
 * @returns Product list from KV
 */
async function getProductsFromKv(): Promise<ProductType[]> {
  const cached = await getJsonKv<ProductType[]>(PRODUCTS_KV_KEY)
  return cached ?? []
}

/**
 * Persists products into KV storage.
 * @param products Products to save
 * @returns Promise resolved when save completes
 */
async function saveProductsToKv(products: ProductType[]): Promise<void> {
  await setJsonKv(PRODUCTS_KV_KEY, products)
}

/**
 * Gets all products for overview usage.
 * @returns Product list
 */
export async function getAllProducts(): Promise<ProductType[]> {
  return getProductsFromKv()
}

/**
 * Gets a product by its id.
 * @param id Product id
 * @returns Product if found, otherwise undefined
 */
export async function getProductById(id: string): Promise<ProductType | undefined> {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  const products = await getProductsFromKv()
  return products.find((product) => product.id === id)
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

  const products = await getProductsFromKv()
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
  await saveProductsToKv(products)
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

  const products = await getProductsFromKv()
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
  await saveProductsToKv(products)
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

  const products = await getProductsFromKv()
  const nextProducts = products.filter((item) => item.id !== id)
  if (nextProducts.length === products.length) {
    return false
  }

  await saveProductsToKv(nextProducts)
  return true
}

export interface ImportProductsResult {
  imported: number
  skipped: number
}

/**
 * Parse products from JSON text (no KV write).
 *
 * Expected formats:
 * - A root array of product objects
 * - An object with `products: Product[]`
 *
 * The importer validates `unit` using the same validation rules as manual create/update.
 *
 * @param jsonText JSON string content
 * @returns Parsed products including imported/skipped counts
 */
export interface ParseProductsResult extends ImportProductsResult {
  products: ProductType[]
}

export async function importProductsFromJsonText(jsonText: string): Promise<ParseProductsResult> {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  if (!jsonText || !jsonText.trim()) {
    throw new Error('JSON text is empty')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('Invalid JSON text')
  }

  const rawItems: unknown = Array.isArray(parsed) ? parsed : (parsed as any)?.products
  if (!Array.isArray(rawItems)) {
    throw new Error('Invalid JSON format: expected an array or { products: Product[] }')
  }

  const nextProducts: ProductType[] = []
  let skipped = 0
  for (const entry of rawItems) {
    if (!entry || typeof entry !== 'object') {
      skipped += 1
      continue
    }

    const e = entry as Partial<ProductType>
    const name = typeof e.name === 'string' ? e.name.trim() : ''
    const unit = typeof e.unit === 'string' ? e.unit.trim() : ''
    const unitBestPriceNum = typeof e.unitBestPrice === 'number' ? e.unitBestPrice : Number(e.unitBestPrice)

    if (!name || !unit || !Number.isFinite(unitBestPriceNum)) {
      skipped += 1
      continue
    }

    const validUnit = validateUnit(unit)
    if (validUnit !== true) {
      skipped += 1
      continue
    }

    const nextId = typeof e.id === 'string' && e.id.trim().length > 0 ? e.id.trim() : String(nextProducts.length)
    const created: ProductType = {
      id: nextId,
      name,
      unit,
      unitBestPrice: unitBestPriceNum,
      brand: typeof e.brand === 'string' && e.brand.trim().length > 0 ? e.brand.trim() : undefined,
      unitConversions: Array.isArray(e.unitConversions) ? e.unitConversions.filter((x) => typeof x === 'string') : undefined,
      remark: typeof e.remark === 'string' && e.remark.trim().length > 0 ? e.remark.trim() : undefined,
    }
    nextProducts.push(created)
  }

  return { imported: nextProducts.length, skipped, products: nextProducts }
}

/**
 * Replace the KV payload for products.
 *
 * This is used by the admin import flow: first parse+preview in the UI, then save to KV.
 *
 * @param products Parsed products to save
 * @returns Promise resolved when KV write completes
 */
export async function replaceProductsInKv(products: ProductType[]): Promise<void> {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  const cleaned: ProductType[] = []
  for (const p of products) {
    if (!p || typeof p !== 'object') continue
    if (typeof p.id !== 'string' || p.id.trim().length === 0) continue
    if (typeof p.name !== 'string' || p.name.trim().length === 0) continue
    if (typeof p.unit !== 'string' || p.unit.trim().length === 0) continue
    if (typeof p.unitBestPrice !== 'number' || !Number.isFinite(p.unitBestPrice)) continue

    const validUnit = validateUnit(p.unit)
    if (validUnit !== true) continue

    cleaned.push({
      ...p,
      id: p.id.trim(),
      name: p.name.trim(),
      unit: p.unit.trim(),
      brand: typeof p.brand === 'string' && p.brand.trim().length > 0 ? p.brand.trim() : undefined,
      unitConversions: Array.isArray(p.unitConversions) ? p.unitConversions.filter((x) => typeof x === 'string') : undefined,
      remark: typeof p.remark === 'string' && p.remark.trim().length > 0 ? p.remark.trim() : undefined,
    })
  }

  await saveProductsToKv(cleaned)
}
