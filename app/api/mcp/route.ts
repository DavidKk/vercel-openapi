import type { NextRequest } from 'next/server'

import { createLogger } from '@/services/logger'

import { execute, manifest } from './server'

export const runtime = 'edge'

const logger = createLogger('api-mcp')

/** GET /api/mcp - MCP manifest (list of tools and schemas), REST style only */
export const GET = async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
  logger.info('manifest request')
  return manifest(req, context)
}

/**
 * POST /api/mcp - Supports two protocols (auto-detected by body):
 * - REST: { tool: string, params?: object } -> { type, result }
 * - JSON-RPC 2.0: { jsonrpc: "2.0", id, method: "tools/list" | "tools/call", params? } -> { jsonrpc, id, result | error }
 */
export const POST = async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
  logger.info('execute request')
  return execute(req, context)
}
