import { createMCPHttpServer } from '@/initializer/mcp'
import type { Tool } from '@/initializer/mcp/tool'

import { getMCPTools } from './tools'

/** MCP service name */
const MCP_NAME = 'unbnd'
/** MCP service version (aligned with package.json) */
const MCP_VERSION = '0.1.0'
/** MCP service description for manifest */
const MCP_DESCRIPTION = 'A private OpenAPI service for personal use.'

const { manifest, execute } = createMCPHttpServer(MCP_NAME, MCP_VERSION, MCP_DESCRIPTION, getMCPTools())

/**
 * Create MCP manifest and execute handlers for a given tool set (e.g. per-module or filtered by includes).
 * @param tools Map of tool name to Tool
 * @returns Object with manifest (GET) and execute (POST) handlers
 */
export function createMCPServerWithTools(tools: Map<string, Tool>) {
  return createMCPHttpServer(MCP_NAME, MCP_VERSION, MCP_DESCRIPTION, tools)
}

export { execute, manifest }
