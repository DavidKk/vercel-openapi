import { NextResponse } from 'next/server'

import { getMCPToolsByCategory } from '@/app/api/mcp/tools'
import { createLogger } from '@/services/logger'
import { mcpToolsToOpenAITools } from '@/utils/function-calling'

export const runtime = 'edge'

const logger = createLogger('api-function-calling-category-tools')

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
    return NextResponse.json({ error: 'Unknown category', allowed: ['dns', 'holiday', 'fuel-price', 'exchange-rate', 'movies', 'weather', 'finance'] }, { status: 404 })
  }
  const tools = mcpToolsToOpenAITools(toolsMap)
  return NextResponse.json({ tools })
}
