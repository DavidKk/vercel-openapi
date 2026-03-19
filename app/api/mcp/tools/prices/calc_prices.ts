import { z } from 'zod'

import { getAllProducts } from '@/app/actions/prices/product'
import { tool } from '@/initializer/mcp'
import { getPriceLevelText } from '@/utils/price/calculatePriceLevel'
import { calculateProductComparisons } from '@/utils/price/calculateProductComparisons'

/**
 * MCP tool: calculate unit-price comparisons for a product list.
 */
export const calc_prices = tool(
  'calc_prices',
  'Calculate unit-price comparisons using productId/productName, totalPrice, totalQuantity, and optional quantityUnit.',
  z.object({
    productId: z.string().optional().describe('Product id'),
    productName: z.string().optional().describe('Product name (used if productId is absent)'),
    totalPrice: z.union([z.string(), z.number()]).describe('Total paid price'),
    totalQuantity: z.union([z.string(), z.number()]).describe('Total quantity value or formula'),
    quantityUnit: z.string().optional().describe('Optional quantity unit, e.g. g, ml'),
  }),
  async (params) => {
    const productId = params.productId?.trim() ?? ''
    const productName = params.productName?.trim() ?? ''
    if (!productId && !productName) {
      throw new Error('Either productId or productName is required')
    }

    const products = await getAllProducts()
    const anchor = productId ? products.find((item) => item.id === productId) : products.find((item) => item.name === productName)
    if (!anchor) {
      throw new Error('Target product not found')
    }

    const totalPrice = typeof params.totalPrice === 'number' ? String(params.totalPrice) : params.totalPrice
    const rawQuantity = typeof params.totalQuantity === 'number' ? String(params.totalQuantity) : params.totalQuantity
    const quantityUnit = params.quantityUnit?.trim() ?? ''
    const totalQuantity = quantityUnit && !rawQuantity.trim().startsWith('=') ? `= ${rawQuantity} ${quantityUnit}` : rawQuantity
    const related = products.filter((item) => item.name === anchor.name)
    const comparisons = calculateProductComparisons(totalPrice, totalQuantity, related).map((item) => ({
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

    return {
      target: {
        productId: anchor.id,
        productName: anchor.name,
      },
      input: {
        totalPrice,
        totalQuantity,
      },
      comparisons,
    }
  }
)
