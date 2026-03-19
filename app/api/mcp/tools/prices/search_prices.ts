import { z } from 'zod'

import { getAllProducts } from '@/app/actions/prices/product'
import { tool } from '@/initializer/mcp'

/**
 * MCP tool: search prices by keyword.
 */
export const search_prices = tool(
  'search_prices',
  'Search products by keyword across name, brand, unit, and remark.',
  z.object({
    q: z.string().min(1).describe('Search keyword'),
  }),
  async (params) => {
    const q = params.q.trim().toLowerCase()
    const products = await getAllProducts()
    const matched = products.filter((product) => {
      const haystack = `${product.name} ${product.brand ?? ''} ${product.unit} ${product.remark ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
    return {
      query: q,
      products: matched,
      total: matched.length,
    }
  }
)
