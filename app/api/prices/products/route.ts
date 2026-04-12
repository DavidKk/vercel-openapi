import { createProduct, deleteProduct, getAllProducts, getProductById, type ProductType, updateProduct } from '@/app/actions/prices/product'
import { api } from '@/initializer/controller'
import { CACHE_CONTROL_KV_CATALOG, cacheControlNoStoreHeaders, invalidParameters, jsonForbidden, jsonSuccess } from '@/initializer/response'

export const runtime = 'edge'

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value.trim())
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function toOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const next = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item)
  return next.length ? next : undefined
}

function isNotAuthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Not authorized'
}

function isErrorWithMessage(error: unknown): error is Error {
  return error instanceof Error && typeof error.message === 'string'
}

/** JSON success / standard envelope headers for mutating or auth-sensitive prices routes */
function noStoreJsonHeaders() {
  const headers = cacheControlNoStoreHeaders()
  headers.set('Charset', 'utf-8')
  headers.set('Content-Type', 'application/json')
  return headers
}

/**
 * Public endpoint for listing and (optionally) fetching products.
 * - GET without `?id`: returns all products
 * - GET with `?id`: returns the specified product (auth-protected in actions)
 *
 * Create/update/delete are available for completeness and are auth-protected in actions.
 */
export const GET = api(async (_req, context) => {
  const id = context.searchParams.get('id') ?? ''
  if (id) {
    try {
      const product = await getProductById(id)
      if (!product) {
        return invalidParameters('product not found').toJsonResponse(404, { headers: cacheControlNoStoreHeaders() })
      }
      return jsonSuccess(product, { headers: noStoreJsonHeaders() })
    } catch (error) {
      if (isNotAuthorizedError(error)) return jsonForbidden('forbidden', { headers: cacheControlNoStoreHeaders() })
      const message = error instanceof Error ? error.message : 'Failed to fetch product'
      return invalidParameters(message).toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
    }
  }

  const products = await getAllProducts()
  return jsonSuccess(products, {
    headers: new Headers({
      Charset: 'utf-8',
      'Content-Type': 'application/json',
      'Cache-Control': CACHE_CONTROL_KV_CATALOG,
    }),
  })
})

export const POST = api(async (req) => {
  let body: any
  try {
    body = await req.json()
  } catch {
    return invalidParameters('Invalid JSON body').toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }

  const name = toOptionalString(body?.name)
  const unit = toOptionalString(body?.unit)
  const unitBestPrice = toOptionalNumber(body?.unitBestPrice)
  const brand = toOptionalString(body?.brand)
  const unitConversions = toOptionalStringArray(body?.unitConversions)
  const remark = toOptionalString(body?.remark)

  if (!name || !unit || unitBestPrice === undefined) {
    return invalidParameters('invalid product payload').toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }

  try {
    const product = await createProduct({ name, unit, unitBestPrice, brand, unitConversions, remark })
    return jsonSuccess(product, { headers: noStoreJsonHeaders() })
  } catch (error) {
    if (isNotAuthorizedError(error)) return jsonForbidden('forbidden', { headers: cacheControlNoStoreHeaders() })

    const message = isErrorWithMessage(error) ? error.message : 'Failed to create product'
    return invalidParameters(message).toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }
})

export const PUT = api(async (req, context) => {
  const id = context.searchParams.get('id') ?? ''
  if (!id) {
    return invalidParameters('missing id').toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return invalidParameters('Invalid JSON body').toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }

  const name = toOptionalString(body?.name)
  const brand = toOptionalString(body?.brand)
  const unit = toOptionalString(body?.unit)
  const unitBestPrice = toOptionalNumber(body?.unitBestPrice)
  const unitConversions = toOptionalStringArray(body?.unitConversions)
  const remark = toOptionalString(body?.remark)

  const updates: Partial<Omit<ProductType, 'id'>> = {}
  if (name !== undefined) updates.name = name
  if (brand !== undefined) updates.brand = brand
  if (unit !== undefined) updates.unit = unit
  if (unitBestPrice !== undefined) updates.unitBestPrice = unitBestPrice
  if (unitConversions !== undefined) updates.unitConversions = unitConversions
  if (remark !== undefined) updates.remark = remark

  if (Object.keys(updates).length === 0) {
    return invalidParameters('invalid product updates').toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }

  try {
    const updated = await updateProduct(id, updates)
    if (!updated) {
      return invalidParameters('product not found').toJsonResponse(404, { headers: cacheControlNoStoreHeaders() })
    }
    return jsonSuccess(updated, { headers: noStoreJsonHeaders() })
  } catch (error) {
    if (isNotAuthorizedError(error)) return jsonForbidden('forbidden', { headers: cacheControlNoStoreHeaders() })

    const message = isErrorWithMessage(error) ? error.message : 'Failed to update product'
    return invalidParameters(message).toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }
})

export const DELETE = api(async (_req, context) => {
  const id = context.searchParams.get('id') ?? ''
  if (!id) {
    return invalidParameters('missing id').toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }

  try {
    await deleteProduct(id)
    return jsonSuccess(true, { headers: noStoreJsonHeaders() })
  } catch (error) {
    if (isNotAuthorizedError(error)) return jsonForbidden('forbidden', { headers: cacheControlNoStoreHeaders() })

    const message = isErrorWithMessage(error) ? error.message : 'Failed to delete product'
    return invalidParameters(message).toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }
})
