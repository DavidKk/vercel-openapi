import { NextResponse } from 'next/server'

import { getMCPTools } from '@/app/api/mcp/tools'
import { mcpToolsToOpenAITools } from '@/utils/function-calling'

export const runtime = 'edge'

/**
 * GET /api/function-calling/tools
 * Returns the same tools as MCP in OpenAI-compatible format.
 * Use this list in Chat Completions requests (tools parameter) so the LLM
 * can return tool_calls; your gateway then executes via POST /api/mcp.
 *
 * @returns { tools: OpenAITool[] }
 */
export async function GET() {
  const toolsMap = getMCPTools()
  const tools = mcpToolsToOpenAITools(toolsMap)
  return NextResponse.json({ tools })
}
