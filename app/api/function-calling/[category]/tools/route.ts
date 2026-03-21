import { NextResponse } from 'next/server'

import { getMCPToolsByCategory } from '@/app/api/mcp/tools'
import { applyNoStoreCache } from '@/initializer/mcp/response'
import { getAuthSession } from '@/services/auth/session'
import { TOOL_CATEGORIES } from '@/services/function-calling/categories'
import { createLogger } from '@/services/logger'
import { mcpToolsToOpenAITools } from '@/utils/function-calling'

export const runtime = 'edge'

const logger = createLogger('api-function-calling-category-tools')

const PROTECTED_PRICES_TOOL_NAMES = ['create_product', 'update_product', 'delete_product'] as const

/**
 * GET /api/function-calling/[category]/tools
 * Returns only the tools for the given category in OpenAI-compatible format.
 * Categories: holiday, fuel-price, exchange-rate.
 * Use when the caller only needs a subset of tools (e.g. holiday-only or exchange-rate-only).
 * Responds with { tools } or 404 if category is unknown.
 */
export async function GET(_request: Request, context: { params: Promise<{ category: string }> }) {
  const { category } = await context.params
  logger.info('request', { category })
  const toolsMap = getMCPToolsByCategory(category)
  if (!toolsMap) {
    return applyNoStoreCache(NextResponse.json({ error: 'Unknown category', allowed: TOOL_CATEGORIES }, { status: 404 }))
  }

  const session = category === 'prices' ? await getAuthSession() : { authenticated: false }
  const filteredTools =
    category === 'prices' && !session.authenticated
      ? (() => {
          const next = new Map(toolsMap)
          for (const name of PROTECTED_PRICES_TOOL_NAMES) {
            next.delete(name)
          }
          return next
        })()
      : toolsMap

  const tools = mcpToolsToOpenAITools(filteredTools)
  return applyNoStoreCache(NextResponse.json({ tools }))
}
