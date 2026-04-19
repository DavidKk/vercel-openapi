import { type NextRequest, NextResponse } from 'next/server'

import { applyNoStoreCache } from '@/initializer/mcp/response'
import { getAuthSession } from '@/services/auth/session'
import { createLogger } from '@/services/logger'

import { getSkillResourceProviderForModuleIds } from './moduleSkillResources'
import { filterProtectedPricesTools } from './pricesToolFilter'
import { createAggregateMcpHandlers, createMCPServerWithTools } from './server'
import { getMCPToolsByIncludes } from './tools'

export const runtime = 'edge'

const logger = createLogger('api-mcp')

function parseIncludesList(req: NextRequest): string[] | null {
  const raw = req.nextUrl.searchParams.get('includes')
  if (raw === null || raw === '') return null
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : null
}

/**
 * Resolve tools for this request: all tools by default, or filtered by query ?includes=holiday,fuel-price
 */
function getToolsForRequest(req: NextRequest) {
  const includes = parseIncludesList(req)
  if (includes === null) return null
  return getMCPToolsByIncludes(includes)
}

function resourceProviderForIncludesRequest(req: NextRequest) {
  const includes = parseIncludesList(req)
  if (includes === null) return undefined
  return getSkillResourceProviderForModuleIds(includes) ?? undefined
}

/** GET /api/mcp - MCP manifest (list of tools and schemas). Use ?includes=holiday,fuel-price to filter by module. */
export const GET = async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
  logger.info('manifest request')
  const session = await getAuthSession()
  const tools = getToolsForRequest(req)
  if (tools !== null) {
    if (tools.size === 0) {
      return applyNoStoreCache(NextResponse.json({ type: 'error', error: { code: 'INVALID_ARGUMENT', message: 'No tools for given includes' } }, { status: 400 }))
    }
    const filtered = filterProtectedPricesTools(tools, session.authenticated)
    const { manifest: manifestHandler } = createMCPServerWithTools(filtered, resourceProviderForIncludesRequest(req))
    return manifestHandler(req, context)
  }
  const { manifest: manifestHandler } = createAggregateMcpHandlers(session.authenticated)
  return manifestHandler(req, context)
}

/**
 * POST /api/mcp - Supports two protocols (auto-detected by body).
 * Use ?includes=holiday,fuel-price to expose only those modules' tools.
 * - REST: { tool: string, params?: object } -> { type, result }
 * - JSON-RPC 2.0: { jsonrpc: "2.0", id, method: "tools/list" | "tools/call", params? } -> { jsonrpc, id, result | error }
 */
export const POST = async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
  logger.info('execute request')
  const session = await getAuthSession()
  const tools = getToolsForRequest(req)
  if (tools !== null) {
    if (tools.size === 0) {
      return applyNoStoreCache(NextResponse.json({ type: 'error', error: { code: 'INVALID_ARGUMENT', message: 'No tools for given includes' } }, { status: 400 }))
    }
    const filtered = filterProtectedPricesTools(tools, session.authenticated)
    const { execute: executeHandler } = createMCPServerWithTools(filtered, resourceProviderForIncludesRequest(req))
    return executeHandler(req, context)
  }
  const { execute: executeHandler } = createAggregateMcpHandlers(session.authenticated)
  return executeHandler(req, context)
}
