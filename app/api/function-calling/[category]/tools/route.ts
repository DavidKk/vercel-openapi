import { NextResponse } from 'next/server'

import { getMCPToolsByCategory } from '@/app/api/mcp/tools'
import { mcpToolsToOpenAITools } from '@/utils/function-calling'

export const runtime = 'edge'

/**
 * GET /api/function-calling/[category]/tools
 * Returns only the tools for the given category in OpenAI-compatible format.
 * Categories: holiday, fuel-price, exchange-rate.
 * Use when the caller only needs a subset of tools (e.g. holiday-only or exchange-rate-only).
 *
 * @param request Not used
 * @param context.params.category One of: holiday, fuel-price, exchange-rate
 * @returns { tools: OpenAITool[] } or 404 if category is unknown
 */
export async function GET(_request: Request, context: { params: Promise<{ category: string }> }) {
  const { category } = await context.params
  const toolsMap = getMCPToolsByCategory(category)
  if (!toolsMap) {
    return NextResponse.json({ error: 'Unknown category', allowed: ['holiday', 'fuel-price', 'exchange-rate'] }, { status: 404 })
  }
  const tools = mcpToolsToOpenAITools(toolsMap)
  return NextResponse.json({ tools })
}
