import { execute, manifest } from './server'

export const runtime = 'edge'

/** GET /api/mcp - MCP manifest (list of tools and schemas) */
export const GET = manifest

/** POST /api/mcp - MCP tool execution (body: { tool: string, params: object }) */
export const POST = execute
