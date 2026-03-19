import { z } from 'zod'

import { createProduct } from '@/app/actions/prices/product'
import { tool } from '@/initializer/mcp'

function parsePositiveNumber(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('unitBestPrice must be a positive number')
  }
  return n
}

/**
 * MCP tool: create a new product (protected).
 */
export const create_product = tool(
  'create_product',
  'Create a new product in the prices list. (Protected: requires authentication)',
  z.object({
    name: z.string().min(1).describe('Product name'),
    brand: z.string().optional().describe('Optional brand'),
    unit: z.string().min(1).describe('Unit string, e.g. g/ml/L'),
    unitBestPrice: z.union([z.string(), z.number()]).describe('Recommended unit price'),
    unitConversions: z.array(z.string()).optional().describe('Optional conversion expressions'),
    remark: z.string().optional().describe('Optional remark'),
  }),
  async (params) => {
    const unitBestPrice = parsePositiveNumber(params.unitBestPrice)
    const product = await createProduct({
      name: params.name.trim(),
      brand: params.brand?.trim() || undefined,
      unit: params.unit.trim(),
      unitBestPrice,
      unitConversions: params.unitConversions?.length ? params.unitConversions : undefined,
      remark: params.remark?.trim() || undefined,
    })

    return product
  }
)
