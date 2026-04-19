import { type NextRequest, NextResponse } from 'next/server'

import type { ContextWithParams } from '@/initializer/controller'
import { api } from '@/initializer/controller'

import { applyNoStoreCache, JSONRPC, jsonRpcError, jsonRpcSuccess, mcpErrorinvalidArguments, mcpErrorMethodNotAllowed, mcpErrorToolNotFound, mcpResponse } from './response'
import type { Tool } from './tool'

const MIN_TOOL_CALL_TIMEOUT_MS = 3_000
const MAX_TOOL_CALL_TIMEOUT_MS = 24_000
const DEFAULT_TOOL_CALL_TIMEOUT_MS = 20_000

/** MCP Tool interface */
export interface MCPManifestTool {
  /** Tool description */
  description?: string
  /** Input schema in JSON Schema format */
  inputSchema: any
  /** Output schema in JSON Schema format (optional) */
  outputSchema?: any
}

/** MCP resource descriptor (HTTP GET manifest / JSON-RPC resources/list). */
export interface MCPManifestResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/** Optional MCP Resources provider (SKILL docs, etc.). */
export interface McpResourceProvider {
  listResources: () => MCPManifestResource[]
  readResource: (uri: string) => Promise<{ mimeType: string; text: string } | null>
}

/** MCP Manifest interface */
export interface MCPManifest {
  /** Service name */
  name: string
  /** Service version */
  version: string
  /** Service description */
  description?: string
  /** Available tools */
  tools: Record<string, MCPManifestTool>
  /** Optional readable resources (shown separately from tools in some MCP clients). */
  resources?: MCPManifestResource[]
}

/**
 * Generate MCP manifest object
 * @param name Service name
 * @param version Service version
 * @param description Service description
 * @param tools Available tools
 * @returns MCP manifest object
 */
export function generateMCPManifest(name: string, version: string, description: string, toolsMap: Map<string, Tool>, resourceProvider?: McpResourceProvider | null): MCPManifest {
  const tools = Object.fromEntries(
    (function* () {
      for (const [, tool] of toolsMap) {
        const manifest: MCPManifestTool = {
          description: tool.description,
          inputSchema: tool.manifest.parameters,
        }

        yield [tool.name, manifest]
      }
    })()
  )

  const base: MCPManifest = { name, version, description, tools }
  if (resourceProvider) {
    base.resources = resourceProvider.listResources()
  }
  return base
}

/**
 * Higher-order function to wrap MCP request processing and integrate with api() function
 * @param handler The actual request handler function
 * @param allowedMethods Allowed HTTP methods, defaults to ['GET', 'POST']
 * @returns Wrapped handler function
 */
function withMCPHandler<P = any>(handler: (req: NextRequest, context: ContextWithParams<P>) => Promise<any>, allowedMethods: string[] = ['GET', 'POST']) {
  return api(async (req: NextRequest, context: ContextWithParams<P>) => {
    try {
      // Validate HTTP method
      const method = req.method || 'GET'
      if (!allowedMethods.includes(method)) {
        return mcpErrorMethodNotAllowed(`Method ${method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`)
      }

      // For POST requests, validate Content-Type
      if (method === 'POST') {
        const contentType = req.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          return mcpErrorinvalidArguments('Content-Type must be application/json for POST requests')
        }
      }

      return await handler(req, context)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return mcpErrorinvalidArguments(message)
    }
  })
}

/**
 * Create manifest handler
 * @param name Service name
 * @param version Service version
 * @param description Service description
 * @param tools Available tools
 * @returns Wrapped manifest handler function
 */
function createManifestHandler(name: string, version: string, description: string, tools: Map<string, Tool>, resourceProvider?: McpResourceProvider | null) {
  return withMCPHandler(async () => {
    const manifest = generateMCPManifest(name, version, description, tools, resourceProvider)
    return applyNoStoreCache(NextResponse.json({ type: 'result', result: manifest }))
  }, ['GET'])
}

/**
 * Build MCP tools array for JSON-RPC tools/list (name, description, inputSchema)
 */
function buildMCPToolsList(tools: Map<string, Tool>): { name: string; description?: string; inputSchema: any }[] {
  return Array.from(tools.entries()).map(([, t]) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.manifest.parameters,
  }))
}

/**
 * Resolve MCP tool-call timeout from env with safe bounds.
 * @returns Timeout in milliseconds
 */
function getMcpToolCallTimeoutMs(): number {
  const raw = process.env.MCP_TOOL_CALL_TIMEOUT_MS?.trim()
  if (!raw) {
    return DEFAULT_TOOL_CALL_TIMEOUT_MS
  }
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return DEFAULT_TOOL_CALL_TIMEOUT_MS
  }
  return Math.min(MAX_TOOL_CALL_TIMEOUT_MS, Math.max(MIN_TOOL_CALL_TIMEOUT_MS, n))
}

/**
 * Execute a tool with bounded wall time so HTTP handlers return before platform hard timeout.
 * @param toolName Tool name for error context
 * @param run Tool execution function
 * @returns Tool result when finished within timeout
 */
async function callToolWithTimeout<T>(toolName: string, run: () => Promise<T>): Promise<T> {
  const timeoutMs = getMcpToolCallTimeoutMs()
  return Promise.race([
    run(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`tool "${toolName}" timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    }),
  ])
}

/**
 * Handle a single JSON-RPC 2.0 request (initialize, tools/list, tools/call, resources/list, resources/read)
 */
async function handleJsonRpcRequest(
  body: { id?: string | number | null; method?: string; params?: any },
  tools: Map<string, Tool>,
  service: { name: string; version: string; description?: string },
  resourceProvider?: McpResourceProvider | null
): Promise<NextResponse> {
  const id = body.id ?? null

  if (body.method === 'initialize') {
    const protocolVersion = (body.params && body.params.protocolVersion) || '2025-06-18'
    const capabilities: Record<string, unknown> = {
      tools: {
        listChanged: false,
      },
    }
    if (resourceProvider) {
      capabilities.resources = {
        subscribe: false,
        listChanged: false,
      }
    }
    return jsonRpcSuccess(id, {
      protocolVersion,
      capabilities,
      serverInfo: {
        name: service.name,
        version: service.version,
        description: service.description,
      },
    })
  }

  if (body.method === 'tools/list') {
    const toolsList = buildMCPToolsList(tools)
    return jsonRpcSuccess(id, { tools: toolsList })
  }

  if (body.method === 'resources/list') {
    if (!resourceProvider) {
      return jsonRpcError(id, JSONRPC.METHOD_NOT_FOUND, 'resources/list not supported for this MCP endpoint')
    }
    return jsonRpcSuccess(id, { resources: resourceProvider.listResources() })
  }

  if (body.method === 'resources/read') {
    if (!resourceProvider) {
      return jsonRpcError(id, JSONRPC.METHOD_NOT_FOUND, 'resources/read not supported for this MCP endpoint')
    }
    const uri = body.params?.uri
    if (!uri || typeof uri !== 'string') {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, 'Missing or invalid "params.uri" for resources/read')
    }
    const payload = await resourceProvider.readResource(uri.trim())
    if (!payload) {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, `Unknown resource URI: ${uri}`)
    }
    return jsonRpcSuccess(id, {
      contents: [{ uri: uri.trim(), mimeType: payload.mimeType, text: payload.text }],
    })
  }

  if (body.method === 'tools/call') {
    const { name, arguments: args = {} } = body.params ?? {}
    if (!name || typeof name !== 'string') {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, 'Missing or invalid "params.name"')
    }

    const tool = tools.get(name)
    if (!tool) {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, `Unknown tool: ${name}`)
    }

    const validation = tool.validateParameters(args)
    if (validation !== true) {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, String(validation))
    }

    try {
      const result = await callToolWithTimeout(name, () => tool.call(args))
      const content = [{ type: 'text' as const, text: JSON.stringify(result) }]
      return jsonRpcSuccess(id, { content, isError: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return jsonRpcSuccess(id, {
        content: [{ type: 'text' as const, text: message }],
        isError: true,
      })
    }
  }

  return jsonRpcError(id, JSONRPC.METHOD_NOT_FOUND, `Method not found: ${body.method ?? 'undefined'}`)
}

/**
 * Create tool execution handler. POST body can be:
 * - JSON-RPC 2.0: { jsonrpc: "2.0", id, method: "tools/list" | "tools/call", params? } -> JSON-RPC response
 * - Legacy REST: { tool: string, params?: object } -> { type: "result", result }
 */
function createToolExecutionHandler(name: string, version: string, description: string, tools: Map<string, Tool>, resourceProvider?: McpResourceProvider | null) {
  return withMCPHandler(
    async (req: NextRequest) => {
      const body = await req.json().catch(() => null)
      if (body == null || typeof body !== 'object') {
        return mcpErrorinvalidArguments('Invalid JSON body')
      }

      const isJsonRpc = body.jsonrpc === '2.0' && typeof body.method === 'string'
      if (isJsonRpc) {
        return handleJsonRpcRequest(body, tools, { name, version, description }, resourceProvider)
      }

      const { tool: toolName, params = {} } = body
      if (!toolName) {
        return mcpErrorinvalidArguments('Missing tool name')
      }

      const tool = tools.get(toolName)
      if (!tool) {
        return mcpErrorToolNotFound(`Tool "${toolName}" not found`)
      }

      const validation = tool.validateParameters(params)
      if (validation !== true) {
        return mcpErrorinvalidArguments(validation)
      }

      const result = await callToolWithTimeout(toolName, () => tool.call(params))
      return mcpResponse(result)
    },
    ['POST']
  )
}

/**
 * Create MCP HTTP server, returning manifest and execute handler functions
 * @param name Service name
 * @param version Service version
 * @param description Service description
 * @param tools Available tools
 * @param resourceProvider Optional MCP Resources (e.g. SKILL markdown) for resources/list and resources/read
 * @returns Object containing manifest and execute handler functions
 */
export function createMCPHttpServer(
  name: string,
  version: string,
  description: string,
  tools: Record<string, Tool> | Map<string, Tool>,
  resourceProvider?: McpResourceProvider | null
) {
  const toolsMap = tools instanceof Map ? tools : new Map(Object.entries(tools))
  const manifest = createManifestHandler(name, version, description, toolsMap, resourceProvider)
  const execute = createToolExecutionHandler(name, version, description, toolsMap, resourceProvider)
  return { manifest, execute }
}
