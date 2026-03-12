import type { Tool } from '@/initializer/mcp/tool'

/**
 * OpenAI-compatible function declaration for Chat Completions API.
 * Used when sending tools to an LLM so it can return tool_calls.
 */
export interface OpenAIFunctionDeclaration {
  /** Function name (must match tool name for execution) */
  name: string
  /** Description for the model to decide when to call */
  description: string
  /** JSON Schema for parameters (type, properties, required) */
  parameters: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
    [key: string]: unknown
  }
}

/**
 * Single tool in OpenAI tools array (type: "function").
 */
export interface OpenAITool {
  type: 'function'
  function: OpenAIFunctionDeclaration
}

/**
 * Convert MCP tools to OpenAI-compatible tools array.
 * Use this to send the same capabilities to an LLM that supports Function Calling
 * (e.g. OpenAI, Anthropic, or compatible gateways).
 *
 * @param toolsMap Map of tool name to MCP Tool instance (e.g. from getMCPTools())
 * @returns Array of tools in OpenAI format for chat completion requests
 */
export function mcpToolsToOpenAITools(toolsMap: Map<string, Tool>): OpenAITool[] {
  const tools: OpenAITool[] = []
  for (const [, t] of toolsMap) {
    const schema = (t.manifest.parameters ?? {}) as Record<string, unknown>
    const parameters: OpenAIFunctionDeclaration['parameters'] = {
      type: 'object',
    }

    if ('properties' in schema && schema.properties && typeof schema.properties === 'object') {
      parameters.properties = schema.properties as Record<string, unknown>
    }
    if ('required' in schema && Array.isArray(schema.required)) {
      parameters.required = schema.required as string[]
    }
    if ('additionalProperties' in schema && schema.additionalProperties !== undefined) {
      parameters.additionalProperties = schema.additionalProperties
    }

    tools.push({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters,
      },
    })
  }
  return tools
}
