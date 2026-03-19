import { z } from 'zod'

import { getAllProducts } from '@/app/actions/prices/product'
import { tool } from '@/initializer/mcp'

/**
 * MCP tool: list available price lists (grouped by product name).
 */
export const list_price_lists = tool('list_price_lists', 'List supported price lists (grouped by product name) and include product counts.', z.object({}), async () => {
  const products = await getAllProducts()
  const map = new Map<string, number>()
  for (const product of products) {
    map.set(product.name, (map.get(product.name) ?? 0) + 1)
  }
  return {
    lists: Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    totalLists: map.size,
    totalProducts: products.length,
  }
})
