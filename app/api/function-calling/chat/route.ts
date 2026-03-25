import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getMCPTools, getMCPToolsByIncludes } from '@/app/api/mcp/tools'
import type { Tool } from '@/initializer/mcp/tool'
import { cacheControlNoStoreHeaders } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import { mcpToolsToOpenAITools } from '@/utils/function-calling'

export const runtime = 'edge'

const logger = createLogger('api-function-calling-chat')

/** Max rounds of tool calls to prevent infinite loops */
const MAX_TOOL_ROUNDS = 10
const MIN_TOOL_CALL_TIMEOUT_MS = 3_000
const MAX_TOOL_CALL_TIMEOUT_MS = 24_000
const DEFAULT_TOOL_CALL_TIMEOUT_MS = 20_000

/**
 * Build a JSON response that must not be stored in shared caches (LLM + tool output).
 * @param body Response JSON body
 * @param status HTTP status
 */
function jsonChat(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: cacheControlNoStoreHeaders() })
}

/**
 * Resolve tool-call timeout from env with safe bounds.
 * @returns Timeout in milliseconds
 */
function getToolCallTimeoutMs(): number {
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
 * Execute a tool with bounded wall time to avoid serverless hard timeout.
 * @param toolName Tool name for error message
 * @param run Tool execution function
 * @returns Tool result when completed in time
 */
async function callToolWithTimeout<T>(toolName: string, run: () => Promise<T>): Promise<T> {
  const timeoutMs = getToolCallTimeoutMs()
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
 * Parse ?includes=holiday,fuel-price from request (same semantics as /api/mcp).
 */
function getToolsForRequest(req: NextRequest): Map<string, Tool> {
  const includes = req.nextUrl.searchParams
    .get('includes')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!includes?.length) return getMCPTools()
  return getMCPToolsByIncludes(includes)
}

/** Function part of a tool call (name + arguments JSON string) */
interface ChatToolCallFunction {
  name: string
  arguments: string
}

/** Single tool call in an assistant message */
interface ChatToolCall {
  id: string
  type: 'function'
  function: ChatToolCallFunction
}

/** OpenAI-compatible chat message (includes tool result messages) */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: ChatToolCall[]
  tool_call_id?: string
  name?: string
}

/** Request body for POST /api/function-calling/chat */
interface ChatRequestBody {
  /** Chat messages (user message required; system optional) */
  messages: ChatMessage[]
  /** Model to use (default gpt-4o-mini) */
  model?: string
}

/** OpenAI chat completion response message (raw shape from API) */
interface OpenAIChatMessage {
  role: string
  content?: string | null
  tool_calls?: Array<{ id: string; function: ChatToolCallFunction }>
}

/**
 * Execute tool by name with parsed arguments using the given tools map.
 * @param toolsMap Available tools (e.g. filtered by ?includes=)
 * @param name Tool name
 * @param argsJson JSON string of arguments
 * @returns Tool result (serialized to string for assistant message)
 */
async function executeTool(toolsMap: Map<string, Tool>, name: string, argsJson: string): Promise<string> {
  const tool = toolsMap.get(name)
  if (!tool) {
    return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
  let params: unknown
  try {
    if (argsJson) {
      params = JSON.parse(argsJson)
    } else {
      params = {}
    }
  } catch {
    return JSON.stringify({ error: 'Invalid arguments JSON' })
  }
  const validation = tool.validateParameters(params)
  if (validation !== true) {
    return JSON.stringify({ error: String(validation) })
  }
  try {
    const result = await callToolWithTimeout(name, () => tool.call(params))
    if (typeof result === 'string') {
      return result
    }
    return JSON.stringify(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.fail('executeTool failed', { name, message })
    return JSON.stringify({ error: message })
  }
}

/**
 * POST /api/function-calling/chat
 * Sends messages + MCP tools (as OpenAI format) to OpenAI; when the model
 * returns tool_calls, executes them via MCP tools and sends results back
 * until the model returns a final text reply.
 *
 * Requires OPENAI_API_KEY. Body: { messages: ChatMessage[], model?: string }
 *
 * @param req NextRequest with JSON body
 * @returns NextResponse with OpenAI-style completion (content or message)
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return jsonChat({ error: 'OPENAI_API_KEY is not set. Set it in environment to use Function Calling chat.' }, 503)
  }

  let body: ChatRequestBody
  try {
    body = await req.json()
  } catch {
    return jsonChat({ error: 'Invalid JSON body' }, 400)
  }

  const { messages: initialMessages, model = 'gpt-4o-mini' } = body
  if (!Array.isArray(initialMessages) || initialMessages.length === 0) {
    return jsonChat({ error: 'messages must be a non-empty array' }, 400)
  }

  logger.info('chat request', { model, messageCount: initialMessages.length })

  const toolsMap = getToolsForRequest(req)
  if (toolsMap.size === 0) {
    return jsonChat({ error: 'No tools for given includes. Use ?includes=holiday,fuel-price etc.' }, 400)
  }
  const tools = mcpToolsToOpenAITools(toolsMap)
  const messages: ChatMessage[] = [...initialMessages]
  let rounds = 0

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: 'auto',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.fail('OpenAI API error', { status: res.status, detail: err })
      return jsonChat({ error: 'OpenAI API error', status: res.status, detail: err }, 502)
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: OpenAIChatMessage }>
      usage?: unknown
    }
    const choice = data.choices?.[0]?.message
    if (!choice) {
      return jsonChat({ error: 'No completion in OpenAI response' }, 502)
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: choice.content ?? undefined,
      tool_calls: choice.tool_calls?.map(
        (tc): ChatToolCall => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })
      ),
    }
    messages.push(assistantMessage)

    if (!assistantMessage.tool_calls?.length) {
      return jsonChat({
        message: { role: 'assistant', content: assistantMessage.content ?? '' },
        usage: data.usage,
      })
    }

    for (const tc of assistantMessage.tool_calls) {
      const content = await executeTool(toolsMap, tc.function.name, tc.function.arguments)
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content,
      })
    }
  }

  return jsonChat({ error: `Exceeded max tool rounds (${MAX_TOOL_ROUNDS}). Last assistant message returned more tool_calls.` }, 429)
}
