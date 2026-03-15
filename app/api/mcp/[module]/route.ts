import { type NextRequest, NextResponse } from 'next/server'

import { createLogger } from '@/services/logger'

import { createMCPServerWithTools } from '../server'
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

  const tools = getMCPToolsByCategory(moduleSlug)
  if (!tools || tools.size === 0) {
    return NextResponse.json({ type: 'error', error: { code: 'NOT_FOUND', message: `Unknown or empty MCP module: ${moduleSlug}` } }, { status: 404 })
  }

  const { manifest } = createMCPServerWithTools(tools)
  return manifest(req, { params: context.params })
}

/**
 * POST /api/mcp/[module] - Execute MCP tool for a single module.
 * Same protocols as /api/mcp (REST and JSON-RPC 2.0). Returns 404 if module is unknown.
 */
export const POST = async (req: NextRequest, context: RouteContext) => {
  const { module: moduleSlug } = await context.params
  logger.info('execute request', { module: moduleSlug })

  const tools = getMCPToolsByCategory(moduleSlug)
  if (!tools || tools.size === 0) {
    return NextResponse.json({ type: 'error', error: { code: 'NOT_FOUND', message: `Unknown or empty MCP module: ${moduleSlug}` } }, { status: 404 })
  }

  const { execute: executeHandler } = createMCPServerWithTools(tools)
  return executeHandler(req, { params: context.params })
}
