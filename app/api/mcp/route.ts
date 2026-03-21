import { type NextRequest, NextResponse } from 'next/server'

import { applyNoStoreCache } from '@/initializer/mcp/response'
import { createLogger } from '@/services/logger'

import { createMCPServerWithTools, execute, manifest } from './server'
import { getMCPToolsByIncludes } from './tools'

export const runtime = 'edge'

const logger = createLogger('api-mcp')

/**
 * Resolve tools for this request: all tools by default, or filtered by query ?includes=holiday,fuel-price
 */
function getToolsForRequest(req: NextRequest) {
  const includes = req.nextUrl.searchParams
    .get('includes')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!includes?.length) {
    return null
  }
  return getMCPToolsByIncludes(includes)
}

/** GET /api/mcp - MCP manifest (list of tools and schemas). Use ?includes=holiday,fuel-price to filter by module. */
export const GET = async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
  logger.info('manifest request')
  const tools = getToolsForRequest(req)
  if (tools !== null) {
    if (tools.size === 0) {
      return applyNoStoreCache(NextResponse.json({ type: 'error', error: { code: 'INVALID_ARGUMENT', message: 'No tools for given includes' } }, { status: 400 }))
    }
    const { manifest: manifestHandler } = createMCPServerWithTools(tools)
    return manifestHandler(req, context)
  }
  return manifest(req, context)
}

/**
 * POST /api/mcp - Supports two protocols (auto-detected by body).
 * Use ?includes=holiday,fuel-price to expose only those modules' tools.
 * - REST: { tool: string, params?: object } -> { type, result }
 * - JSON-RPC 2.0: { jsonrpc: "2.0", id, method: "tools/list" | "tools/call", params? } -> { jsonrpc, id, result | error }
 */
export const POST = async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
  logger.info('execute request')
  const tools = getToolsForRequest(req)
  if (tools !== null) {
    if (tools.size === 0) {
      return applyNoStoreCache(NextResponse.json({ type: 'error', error: { code: 'INVALID_ARGUMENT', message: 'No tools for given includes' } }, { status: 400 }))
    }
    const { execute: executeHandler } = createMCPServerWithTools(tools)
    return executeHandler(req, context)
  }
  return execute(req, context)
}
