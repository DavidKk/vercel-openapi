import { z } from 'zod'

import { updateProduct } from '@/app/actions/prices/product'
import { tool } from '@/initializer/mcp'

function parseOptionalPositiveNumber(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('unitBestPrice must be a positive number')
  }
  return n
}

/**
 * MCP tool: update an existing product (protected).
 */
export const update_product = tool(
  'update_product',
  'Update an existing product by id. (Protected: requires authentication)',
  z.object({
    id: z.string().min(1).describe('Product id'),
    name: z.string().optional().describe('Optional product name'),
    brand: z.string().optional().describe('Optional brand'),
    unit: z.string().optional().describe('Optional unit string'),
    unitBestPrice: z.union([z.string(), z.number()]).optional().describe('Optional recommended unit price'),
    unitConversions: z.array(z.string()).optional().describe('Optional conversion expressions'),
    remark: z.string().optional().describe('Optional remark'),
  }),
  async (params) => {
    const updated = await updateProduct(params.id, {
      name: params.name?.trim() || undefined,
      brand: params.brand?.trim() || undefined,
      unit: params.unit?.trim() || undefined,
      unitBestPrice: parseOptionalPositiveNumber(params.unitBestPrice),
      unitConversions: params.unitConversions?.length ? params.unitConversions : undefined,
      remark: params.remark?.trim() || undefined,
    })

    if (!updated) {
      throw new Error('product not found')
    }

    return updated
  }
)
