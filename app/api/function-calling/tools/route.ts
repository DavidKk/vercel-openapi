import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getMCPTools, getMCPToolsByIncludes } from '@/app/api/mcp/tools'
import { applyNoStoreCache } from '@/initializer/mcp/response'
import { getAuthSession } from '@/services/auth/session'
import { createLogger } from '@/services/logger'
import { mcpToolsToOpenAITools } from '@/utils/function-calling'

export const runtime = 'edge'

const logger = createLogger('api-function-calling-tools')

const PROTECTED_PRICES_TOOL_NAMES = ['create_product', 'update_product', 'delete_product'] as const

/**
 * Parse ?includes=holiday,fuel-price from request (same semantics as /api/mcp).
 * @returns Map of tools when includes is present, null to use all tools
 */
function getToolsForRequest(req: NextRequest) {
  const includes = req.nextUrl.searchParams
    .get('includes')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!includes?.length) return null
  return getMCPToolsByIncludes(includes)
}

/**
 * GET /api/function-calling/tools
 * Returns the same tools as MCP in OpenAI-compatible format.
 * Use ?includes=holiday,fuel-price to restrict to those modules (same as /api/mcp).
 * Use this list in Chat Completions requests (tools parameter) so the LLM
 * can return tool_calls; your gateway then executes via POST /api/mcp.
 */
export async function GET(req: NextRequest) {
  logger.info('request')
  const toolsMap = getToolsForRequest(req) ?? getMCPTools()
  if (toolsMap.size === 0) {
    return applyNoStoreCache(NextResponse.json({ error: 'No tools for given includes. Use ?includes=holiday,fuel-price etc.' }, { status: 400 }))
  }

  const session = await getAuthSession()
  const filteredTools = !session.authenticated
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
