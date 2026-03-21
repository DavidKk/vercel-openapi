import { type NextRequest, NextResponse } from 'next/server'

import { applyNoStoreCache } from '@/initializer/mcp/response'
import { getAuthSession } from '@/services/auth/session'
import { createLogger } from '@/services/logger'

import { createMCPServerWithTools } from '../server'
import { getMCPToolsByCategory } from '../tools'

export const runtime = 'edge'

const logger = createLogger('api-mcp-module')

type RouteContext = { params: Promise<{ module: string }> }

const PROTECTED_PRICES_TOOL_NAMES = ['create_product', 'update_product', 'delete_product'] as const

function filterProtectedPricesTools(tools: Map<string, any>, authenticated: boolean) {
  if (authenticated) return tools
  const next = new Map(tools)
  for (const name of PROTECTED_PRICES_TOOL_NAMES) {
    next.delete(name)
  }
  return next
}

/**
 * GET /api/mcp/[module] - MCP manifest for a single module (e.g. /api/mcp/holiday).
 * Returns 404 if module is unknown or has no tools.
 */
export const GET = async (req: NextRequest, context: RouteContext) => {
  const { module: moduleSlug } = await context.params
  logger.info('manifest request', { module: moduleSlug })

  const session = moduleSlug === 'prices' ? await getAuthSession() : { authenticated: false }
  const tools = getMCPToolsByCategory(moduleSlug)
  if (!tools || tools.size === 0) {
    return applyNoStoreCache(NextResponse.json({ type: 'error', error: { code: 'NOT_FOUND', message: `Unknown or empty MCP module: ${moduleSlug}` } }, { status: 404 }))
  }

  const filteredTools = moduleSlug === 'prices' ? filterProtectedPricesTools(tools, session.authenticated) : tools
  const { manifest } = createMCPServerWithTools(filteredTools)
  return manifest(req, { params: context.params })
}

/**
 * POST /api/mcp/[module] - Execute MCP tool for a single module.
 * Same protocols as /api/mcp (REST and JSON-RPC 2.0). Returns 404 if module is unknown.
 */
export const POST = async (req: NextRequest, context: RouteContext) => {
  const { module: moduleSlug } = await context.params
  logger.info('execute request', { module: moduleSlug })

  const session = moduleSlug === 'prices' ? await getAuthSession() : { authenticated: false }
  const tools = getMCPToolsByCategory(moduleSlug)
  if (!tools || tools.size === 0) {
    return applyNoStoreCache(NextResponse.json({ type: 'error', error: { code: 'NOT_FOUND', message: `Unknown or empty MCP module: ${moduleSlug}` } }, { status: 404 }))
  }

  const filteredTools = moduleSlug === 'prices' ? filterProtectedPricesTools(tools, session.authenticated) : tools
  const { execute: executeHandler } = createMCPServerWithTools(filteredTools)
  return executeHandler(req, { params: context.params })
}
