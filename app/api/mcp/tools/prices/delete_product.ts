import { z } from 'zod'

import { deleteProduct } from '@/app/actions/prices/product'
import { tool } from '@/initializer/mcp'

/**
 * MCP tool: delete a product by id (protected).
 */
export const delete_product = tool(
  'delete_product',
  'Delete a product by id. (Protected: requires authentication)',
  z.object({
    id: z.string().min(1).describe('Product id'),
  }),
  async (params) => {
    const success = await deleteProduct(params.id)
    if (!success) {
      throw new Error('product not found')
    }
    return { success }
  }
)
