import { execute, manifest } from './server'

export const runtime = 'edge'

/** GET /api/mcp - MCP manifest (list of tools and schemas), REST style only */
export const GET = manifest

/**
 * POST /api/mcp - Supports two protocols (auto-detected by body):
 * - REST: { tool: string, params?: object } -> { type, result }
 * - JSON-RPC 2.0: { jsonrpc: "2.0", id, method: "tools/list" | "tools/call", params? } -> { jsonrpc, id, result | error }
 */
export const POST = execute
