import { getAllProducts } from '@/app/actions/prices/product'
import { api } from '@/initializer/controller'
import { invalidParameters, jsonSuccess } from '@/initializer/response'
import { getPriceLevelText } from '@/utils/price/calculatePriceLevel'
import { calculateProductComparisons } from '@/utils/price/calculateProductComparisons'

export const runtime = 'edge'

interface CalcRequestBody {
  productId?: string
  productName?: string
  totalPrice: number | string
  totalQuantity: number | string
  quantityUnit?: string
}

/**
 * Public prices calculation endpoint.
 * Body:
 * - productId or productName
 * - totalPrice
 * - totalQuantity
 * - quantityUnit (optional, used to build formula quantity)
 */
export const POST = api(async (req) => {
  let body: CalcRequestBody
  try {
    body = (await req.json()) as CalcRequestBody
  } catch {
    return invalidParameters('Invalid JSON body').toJsonResponse(400)
  }

  const productId = typeof body.productId === 'string' ? body.productId.trim() : ''
  const productName = typeof body.productName === 'string' ? body.productName.trim() : ''
  if (!productId && !productName) {
    return invalidParameters('Either productId or productName is required').toJsonResponse(400)
  }

  const totalPrice = typeof body.totalPrice === 'number' ? String(body.totalPrice) : String(body.totalPrice ?? '')
  const rawQuantity = typeof body.totalQuantity === 'number' ? String(body.totalQuantity) : String(body.totalQuantity ?? '')
  const quantityUnit = typeof body.quantityUnit === 'string' ? body.quantityUnit.trim() : ''
  const totalQuantity = quantityUnit && !rawQuantity.trim().startsWith('=') ? `= ${rawQuantity} ${quantityUnit}` : rawQuantity

  const products = await getAllProducts()
  const anchor = productId ? products.find((item) => item.id === productId) : products.find((item) => item.name === productName)
  if (!anchor) {
    return invalidParameters('Target product not found').toJsonResponse(404)
  }

  const relatedProducts = products.filter((item) => item.name === anchor.name)
  const comparisons = calculateProductComparisons(totalPrice, totalQuantity, relatedProducts).map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    brand: item.product.brand ?? null,
    unit: item.product.unit,
    unitBestPrice: item.product.unitBestPrice,
    quantity: item.quantity,
    unitCurrentPrice: item.unitCurrentPrice,
    level: item.level,
    levelText: getPriceLevelText(item.level),
  }))

  return jsonSuccess({
    target: {
      productId: anchor.id,
      productName: anchor.name,
      unit: anchor.unit,
    },
    input: {
      totalPrice,
      totalQuantity,
    },
    comparisons,
  })
})
