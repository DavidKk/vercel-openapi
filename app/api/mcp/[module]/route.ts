import { type NextRequest, NextResponse } from 'next/server'

import { applyNoStoreCache } from '@/initializer/mcp/response'
import { getAuthSession } from '@/services/auth/session'
import { createLogger } from '@/services/logger'

import { getSkillResourceProviderForModule } from '../moduleSkillResources'
import { filterProtectedPricesTools } from '../pricesToolFilter'
import { createMCPServerWithTools } from '../server'
import { mcpServiceNameForModule } from '../skillNaming'
import { getMCPToolsByCategory } from '../tools'

export const runtime = 'edge'

const logger = createLogger('api-mcp-module')

type RouteContext = { params: Promise<{ module: string }> }

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
  const resourceProvider = getSkillResourceProviderForModule(moduleSlug)
  const serverOptions = { serviceName: mcpServiceNameForModule(moduleSlug) }
  const { manifest } = createMCPServerWithTools(filteredTools, resourceProvider, serverOptions)
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
  const resourceProvider = getSkillResourceProviderForModule(moduleSlug)
  const serverOptions = { serviceName: mcpServiceNameForModule(moduleSlug) }
  const { execute: executeHandler } = createMCPServerWithTools(filteredTools, resourceProvider, serverOptions)
  return executeHandler(req, { params: context.params })
}
