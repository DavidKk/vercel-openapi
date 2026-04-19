import { createMCPHttpServer, type McpResourceProvider } from '@/initializer/mcp'
import type { Tool } from '@/initializer/mcp/tool'

import packageJson from '../../../package.json'
import { getAllModulesSkillResourceProvider } from './moduleSkillResources'
import { filterProtectedPricesTools } from './pricesToolFilter'
import { getMCPTools } from './tools'

/** MCP service name */
const MCP_NAME = 'unbnd'
/** MCP service version (single source: package.json) */
const MCP_VERSION = typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'
/** MCP service description for manifest */
const MCP_DESCRIPTION = 'A private OpenAPI service for personal use.'

/** Aggregate `/api/mcp` handlers: all tools (minus protected Prices when anonymous) and all SKILL resources. */
export function createAggregateMcpHandlers(authenticated: boolean) {
  const tools = filterProtectedPricesTools(getMCPTools(), authenticated)
  return createMCPHttpServer(MCP_NAME, MCP_VERSION, MCP_DESCRIPTION, tools, getAllModulesSkillResourceProvider())
}

/**
 * Create MCP manifest and execute handlers for a given tool set (e.g. per-module or filtered by includes).
 * @param tools Map of tool name to Tool
 * @returns Object with manifest (GET) and execute (POST) handlers
 */
export type CreateMCPServerWithToolsOptions = {
  /** Overrides manifest / JSON-RPC `serverInfo.name` (e.g. `unbnd-prices` for the Prices-only MCP). Defaults to package name `unbnd`. */
  serviceName?: string
}

export function createMCPServerWithTools(tools: Map<string, Tool>, resourceProvider?: McpResourceProvider | null, options?: CreateMCPServerWithToolsOptions | null) {
  const name = options?.serviceName?.trim() || MCP_NAME
  return createMCPHttpServer(name, MCP_VERSION, MCP_DESCRIPTION, tools, resourceProvider ?? undefined)
}
