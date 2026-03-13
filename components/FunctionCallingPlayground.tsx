'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

type Tab = 'tools' | 'chat'

/** Preset prompts per category (module-scoped). Empty string key = geo / all modules combined. */
const PRESET_PROMPTS_BY_CATEGORY: Record<string, { label: string; value: string }[]> = {
  holiday: [
    { label: '今天是不是节假日？', value: '今天是不是节假日？' },
    { label: '今年有哪些假期？', value: '今年（当前年份）有哪些假期？列一下。' },
  ],
  'exchange-rate': [{ label: '100 美元换人民币多少？', value: '100 美元换人民币大概多少？' }],
  'fuel-price': [
    { label: '各省油价', value: '各省油价多少？' },
    { label: '北京92号油价', value: '北京92号汽油价格？' },
    { label: '充值优惠', value: '北京充值200块有什么优惠？' },
  ],
  movies: [
    { label: '最近有什么热门电影？', value: '最近上映或者快上映的热门电影有哪些？' },
    { label: '今年的新片列表', value: '今年有哪些评分比较高的新片？' },
  ],
  '': [
    { label: '今天是不是节假日？', value: '今天是不是节假日？' },
    { label: '100 美元换人民币多少？', value: '100 美元换人民币大概多少？' },
    { label: '今年有哪些假期？', value: '今年（当前年份）有哪些假期？列一下。' },
  ],
}

/**
 * Tool names per category: module must only call tools from its own category (no cross-module).
 * Keep in sync with CATEGORY_TOOL_NAMES in app/api/mcp/tools/index.ts.
 */
const TOOL_NAMES_BY_CATEGORY: Record<string, string[]> = {
  holiday: ['get_today_holiday', 'list_holiday', 'is_workday', 'is_holiday'],
  'fuel-price': ['get_fuel_price', 'get_fuel_price_by_province', 'calc_fuel_recharge_promo'],
  'exchange-rate': ['get_exchange_rate', 'convert_currency'],
  movies: ['list_latest_movies'],
}

/** Province names for fuel-price tool param extraction (match order for .at(0)) */
const PROVINCE_PATTERN =
  /北京|上海|广东|浙江|江苏|山东|河南|四川|湖北|福建|河北|湖南|安徽|陕西|辽宁|江西|重庆|云南|广西|山西|贵州|甘肃|黑龙江|吉林|海南|内蒙古|宁夏|青海|新疆|西藏|天津/

/** Mock tool call: name + params to send to POST /api/mcp */
interface MockToolCall {
  name: string
  params: Record<string, unknown>
}

/**
 * Infer mock tool calls from user message (keyword-based, no LLM).
 * When category is set (module-scoped), only returns tools for that category — no cross-module.
 *
 * @param message User message
 * @param category 'holiday' | 'fuel-price' | 'exchange-rate' (module) or '' (geo / all)
 * @returns List of { name, params } to execute via POST /api/mcp
 */
function mockInferToolCalls(message: string, category: string): MockToolCall[] {
  const m = message.trim()
  const calls: MockToolCall[] = []
  const year = new Date().getFullYear()
  const isModuleScoped = category !== ''
  const isHoliday = !isModuleScoped || category === 'holiday'
  const isExchange = !isModuleScoped || category === 'exchange-rate'
  const isFuel = !isModuleScoped || category === 'fuel-price'

  if (isHoliday && /今天|今日/.test(m) && /节假|假期|放假/.test(m)) {
    calls.push({ name: 'get_today_holiday', params: {} })
  }
  if (isHoliday && /今年|当前年/.test(m) && /假期|节假日|放假/.test(m)) {
    calls.push({ name: 'list_holiday', params: { year } })
  }
  if (isExchange) {
    const amountMatch = m.match(/(\d+(?:\.\d+)?)\s*美元|美元\s*(\d+(?:\.\d+)?)/) ?? m.match(/(\d+)\s*块\s*美元/)
    const amount = amountMatch ? parseFloat(amountMatch[1] ?? amountMatch[2] ?? '100') : 100
    if (/(美元|USD).*?(人民币|CNY|换)|(人民币|CNY).*?(美元|USD)|换.*?人民币/.test(m)) {
      calls.push({ name: 'convert_currency', params: { from: 'USD', to: 'CNY', amount } })
    }
  }
  if (isFuel && /油价|汽油|价格/.test(m)) {
    if (/各省|全国|所有/.test(m)) {
      calls.push({ name: 'get_fuel_price', params: {} })
    } else {
      const province = m.match(PROVINCE_PATTERN)?.at(0) ?? '北京'
      calls.push({ name: 'get_fuel_price_by_province', params: { province } })
    }
  }
  if (isFuel && /充值|优惠|促销/.test(m)) {
    const amountMatch = m.match(/(\d+)\s*块|充值\s*(\d+)/)
    const amount = amountMatch ? parseInt(amountMatch[1] ?? amountMatch[2] ?? '200', 10) : 200
    const province = m.match(PROVINCE_PATTERN)?.at(0) ?? '北京'
    calls.push({ name: 'calc_fuel_recharge_promo', params: { province, amount, bonus: 10 } })
  }

  if (calls.length === 0 && isHoliday) {
    calls.push({ name: 'get_today_holiday', params: {} })
  }
  if (calls.length === 0 && isExchange) {
    calls.push({ name: 'convert_currency', params: { from: 'USD', to: 'CNY', amount: 100 } })
  }
  if (calls.length === 0 && isFuel) {
    calls.push({ name: 'get_fuel_price', params: {} })
  }

  /** Module-scoped: only return tools that belong to this category (no cross-module) */
  const allowed = isModuleScoped ? TOOL_NAMES_BY_CATEGORY[category] : undefined
  if (allowed) {
    return calls.filter((c) => allowed.includes(c.name))
  }
  return calls
}

/**
 * Call POST /api/mcp for one tool and return parsed result or error string.
 *
 * @param name MCP tool name (e.g. get_today_holiday, convert_currency)
 * @param params Tool parameters object
 * @returns Parsed result (object or string) or error string when request fails
 */
async function callMcpTool(name: string, params: Record<string, unknown>): Promise<unknown> {
  const res = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: name, params }),
  })
  const text = await res.text()
  if (!res.ok) {
    return text
  }
  try {
    const data = JSON.parse(text)
    return data.result ?? data
  } catch {
    return text
  }
}

/**
 * Build a short mock assistant reply from tool results (no LLM).
 *
 * @param toolCalls List of inferred tool calls (name + params)
 * @param results Results from POST /api/mcp for each tool
 * @returns Single formatted string for assistant content
 */
function mockFormatReply(toolCalls: MockToolCall[], results: unknown[]): string {
  const parts: string[] = []
  for (let i = 0; i < toolCalls.length; i++) {
    const { name, params } = toolCalls[i]
    const result = results[i]
    let resultStr: string
    if (typeof result === 'object' && result !== null) {
      resultStr = JSON.stringify(result, null, 0)
    } else {
      resultStr = String(result)
    }
    parts.push(`【${name}】(params: ${JSON.stringify(params)}) → ${resultStr}`)
  }
  parts.push('\n[Mock summary] The tool calls above were executed via the local MCP HTTP endpoint.')
  return parts.join('\n')
}

/**
 * Render chat response body (error, assistant reply + raw JSON, or placeholder).
 *
 * @param chatError Error message when request failed
 * @param chatReply Formatted assistant reply text
 * @param chatResponseBody Raw JSON string (tool_calls + tool_results)
 * @returns React node for the response area
 */
function renderChatResponseContent(chatError: string | undefined, chatReply: string | undefined, chatResponseBody: string | undefined): ReactNode {
  if (chatError) {
    return <pre className="text-red-600">{chatError}</pre>
  }
  if (chatReply) {
    return (
      <div className="space-y-2">
        <p className="font-medium text-gray-700">Assistant:</p>
        <p className="whitespace-pre-wrap rounded bg-gray-50 p-2">{chatReply}</p>
        {chatResponseBody && (
          <details className="mt-2" open>
            <summary className="cursor-pointer text-gray-500">Raw JSON (tool_calls + tool_results)</summary>
            <div className="mt-1">
              <JsonViewer value={chatResponseBody} />
            </div>
          </details>
        )}
      </div>
    )
  }
  if (chatResponseBody) {
    return <JsonViewer value={chatResponseBody} />
  }
  return <span className="text-gray-500">Click a preset. Mock flow: infer tool_calls → POST /api/mcp → show result (no LLM).</span>
}

/**
 * Render tools response body (error, JSON, or placeholder).
 *
 * @param toolsError Error message when fetch failed
 * @param toolsResponseBody Raw JSON string from GET tools endpoint
 * @returns React node for the response area
 */
function renderToolsResponseContent(toolsError: string | undefined, toolsResponseBody: string | undefined): ReactNode {
  if (toolsError) {
    return <pre className="text-red-600">{toolsError}</pre>
  }
  if (toolsResponseBody) {
    return <JsonViewer value={toolsResponseBody} />
  }
  return <span className="text-gray-500">Click &quot;Fetch tools&quot; to load the OpenAI-compatible tools list.</span>
}

export interface FunctionCallingPlaygroundProps {
  /** Tools category for this module: '' = geo (all tools), 'holiday' | 'fuel-price' | 'exchange-rate' = that module only. No Category selector. */
  defaultToolsCategory?: string
}

/**
 * Playground for Function Calling: GET /api/function-calling/tools or /api/function-calling/[category]/tools, and a mock chat flow.
 * Mock chat: infer tool_calls from message, call POST /api/mcp, then show a synthetic reply (no LLM).
 */
export function FunctionCallingPlayground(props: FunctionCallingPlaygroundProps) {
  const { defaultToolsCategory = '' } = props
  const [tab, setTab] = useState<Tab>('tools')
  /** Each module uses only its own category (geo has no category → '' = all tools). No Category selector. */
  const effectiveCategory = defaultToolsCategory
  const presetPrompts = PRESET_PROMPTS_BY_CATEGORY[effectiveCategory] ?? PRESET_PROMPTS_BY_CATEGORY['']

  const [toolsLoading, setToolsLoading] = useState(false)
  const [toolsStatus, setToolsStatus] = useState<number | undefined>(undefined)
  const [toolsDurationMs, setToolsDurationMs] = useState<number | undefined>(undefined)
  const [toolsError, setToolsError] = useState<string | undefined>(undefined)
  const [toolsResponseBody, setToolsResponseBody] = useState<string | undefined>(undefined)

  const [chatLoading, setChatLoading] = useState(false)
  const [chatStatus, setChatStatus] = useState<number | undefined>(undefined)
  const [chatDurationMs, setChatDurationMs] = useState<number | undefined>(undefined)
  const [chatError, setChatError] = useState<string | undefined>(undefined)
  const [chatResponseBody, setChatResponseBody] = useState<string | undefined>(undefined)
  const [chatReply, setChatReply] = useState<string | undefined>(undefined)

  async function handleFetchTools() {
    setToolsLoading(true)
    setToolsError(undefined)
    setToolsResponseBody(undefined)
    setToolsStatus(undefined)
    const startedAt = performance.now()
    const url = effectiveCategory ? `/api/function-calling/${effectiveCategory}/tools` : '/api/function-calling/tools'
    try {
      const res = await fetch(url, { method: 'GET' })
      const duration = performance.now() - startedAt
      const text = await res.text()
      setToolsStatus(res.status)
      setToolsDurationMs(duration)
      setToolsResponseBody(text)
    } catch (err) {
      setToolsError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setToolsLoading(false)
    }
  }

  async function handleSendChat(prompt: string) {
    const text = prompt.trim()
    if (!text) {
      return
    }

    setChatLoading(true)
    setChatError(undefined)
    setChatResponseBody(undefined)
    setChatReply(undefined)
    setChatStatus(undefined)
    const startedAt = performance.now()
    try {
      const toolCalls = mockInferToolCalls(text, effectiveCategory)
      const results: unknown[] = []
      for (const tc of toolCalls) {
        const result = await callMcpTool(tc.name, tc.params)
        results.push(result)
      }
      const duration = performance.now() - startedAt
      setChatDurationMs(duration)
      setChatStatus(200)

      const reply = mockFormatReply(toolCalls, results)
      setChatReply(reply)
      setChatResponseBody(
        JSON.stringify(
          {
            message: { role: 'assistant', content: reply },
            flow: { tool_calls: toolCalls, tool_results: results },
          },
          null,
          2
        )
      )
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <PlaygroundPanelHeader />
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-3 py-2">
        <button
          type="button"
          onClick={() => setTab('tools')}
          className={`rounded px-2 py-1 text-[11px] font-medium ${tab === 'tools' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Tools (GET)
        </button>
        <button
          type="button"
          onClick={() => setTab('chat')}
          className={`rounded px-2 py-1 text-[11px] font-medium ${tab === 'chat' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Chat (POST)
        </button>
      </div>

      {tab === 'chat' && (
        <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden bg-gray-100">
          <div className="flex shrink-0 flex-col bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
              <span className="font-medium text-gray-800">Request</span>
              <span className={PLAYGROUND_HEADER_BADGE_CLASS}>Mock flow (POST /api/mcp)</span>
            </div>
            <div className="space-y-2 px-3 py-2">
              <p className="text-[11px] text-gray-600">Preset (click to trigger tool calls):</p>
              <div className="flex flex-wrap gap-1">
                {presetPrompts.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleSendChat(p.value)}
                    disabled={chatLoading}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-[10px] text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {chatDurationMs !== undefined && <span className="text-[10px] text-gray-500">Last run: {chatDurationMs.toFixed(0)} ms</span>}
            </div>
          </div>
          <div className="flex min-h-[200px] min-w-0 flex-1 flex-col overflow-hidden bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
              <span className="font-medium text-gray-800">Response</span>
              {chatStatus !== undefined && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">HTTP {chatStatus}</span>}
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-white p-2 text-[10px] leading-relaxed text-gray-800">
              {renderChatResponseContent(chatError, chatReply, chatResponseBody)}
            </div>
          </div>
        </div>
      )}

      {tab === 'tools' && (
        <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden bg-gray-100">
          <div className="flex shrink-0 flex-col bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
              <span className="font-medium text-gray-800">Request</span>
              <span className={PLAYGROUND_HEADER_BADGE_CLASS}>GET {effectiveCategory ? `/api/function-calling/${effectiveCategory}/tools` : '/api/function-calling/tools'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={handleFetchTools}
                className="inline-flex items-center justify-center rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={toolsLoading}
              >
                {toolsLoading ? 'Fetching...' : 'Fetch tools'}
              </button>
              {toolsDurationMs !== undefined && <span className="text-[10px] text-gray-500">{toolsDurationMs.toFixed(0)} ms</span>}
            </div>
          </div>
          <div className="flex min-h-[200px] min-w-0 flex-1 flex-col overflow-hidden bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
              <span className="font-medium text-gray-800">Response</span>
              {toolsStatus !== undefined && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">HTTP {toolsStatus}</span>}
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-white p-2 text-[10px] leading-relaxed text-gray-800">{renderToolsResponseContent(toolsError, toolsResponseBody)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
