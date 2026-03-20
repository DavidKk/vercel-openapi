'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { FormSelect } from '@/components/FormSelect'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import { TOOL_CATEGORIES, type ToolCategory } from '@/services/function-calling/categories'

type PlaygroundEndpoint = 'tools' | 'chat'
type ScopeMode = 'all' | 'category' | 'includes'

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
  prices: [
    { label: '当前有哪些价目表？', value: '当前支持的价目表有哪些？' },
    { label: '搜索可乐', value: '帮我搜索可乐相关的商品。' },
    { label: '按总价总量计算', value: '可乐总价12.5元，总量1.5L，帮我算每个品牌单价对比。' },
  ],
  'proxy-rule': [{ label: '导出 Proxy 规则集', value: '帮我列出 Clash 里 action 为 Proxy 的合并 RULE-SET 行。' }],
  '': [],
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
  prices: ['list_price_lists', 'search_prices', 'calc_prices', 'create_product', 'update_product', 'delete_product'],
  'proxy-rule': ['get_clash_rule_config'],
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
  const isPrices = !isModuleScoped || category === 'prices'
  const isProxyRule = !isModuleScoped || category === 'proxy-rule'

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

  if (isPrices) {
    if (/价目表|列表|有哪些/.test(m) && /价格|价目|商品/.test(m)) {
      calls.push({ name: 'list_price_lists', params: {} })
    }
    if (/搜索|查找|匹配/.test(m)) {
      const keyword = m.match(/搜索|查找|匹配/) ? m.replace(/.*?(搜索|查找|匹配)\s*/, '').trim() : ''
      calls.push({ name: 'search_prices', params: { q: keyword || 'cola' } })
    }
    if (/(总价|总量|单价|对比|计算)/.test(m)) {
      const priceMatch = m.match(/总价\s*(\d+(?:\.\d+)?)/)
      const quantityMatch = m.match(/总量\s*(\d+(?:\.\d+)?)/)
      const unitMatch = m.match(/总量\s*\d+(?:\.\d+)?\s*([a-zA-Z\u4e00-\u9fa5]+)/u)
      const nameMatch = m.match(/(可乐|牛奶|鸡蛋|大米|食用油)/)
      calls.push({
        name: 'calc_prices',
        params: {
          productName: nameMatch?.[1] ?? 'cola',
          totalPrice: priceMatch ? Number(priceMatch[1]) : 12.5,
          totalQuantity: quantityMatch ? Number(quantityMatch[1]) : 1.5,
          quantityUnit: unitMatch?.[1] ?? 'L',
        },
      })
    }

    if (/(创建|新增|添加|新建)/.test(m) && /产品|商品|价目/.test(m)) {
      const idMatch = m.match(/id\s*(\d+)/i) // may appear but create_product doesn't need id
      void idMatch
      const nameMatch = m.match(/名称\s*[:：]?\s*([^\s，。、;；]+)|(?:产品|商品)[:：]?\s*([^\s，。、;；]+)/i)
      const name = nameMatch?.[1] ?? nameMatch?.[2] ?? 'cola'
      const unitMatch = m.match(/(ml|g|kg|L)\b/i)?.[1] ?? 'L'
      const bestPriceMatch = m.match(/单价\s*[:：]?\s*(\d+(?:\.\d+)?)/)
      const unitBestPrice = bestPriceMatch ? Number(bestPriceMatch[1]) : 1.23
      calls.push({
        name: 'create_product',
        params: { name, brand: undefined, unit: unitMatch, unitBestPrice, unitConversions: undefined, remark: undefined },
      })
    }

    if (/(更新|修改|变更)/.test(m) && /产品|商品|价目/.test(m)) {
      const idMatch = m.match(/id\s*(\d+)/i) ?? m.match(/产品id\s*(\d+)/)
      const id = idMatch?.[1] ?? '12'
      const bestPriceMatch = m.match(/单价\s*[:：]?\s*(\d+(?:\.\d+)?)/)
      const unitBestPrice = bestPriceMatch ? Number(bestPriceMatch[1]) : undefined
      calls.push({
        name: 'update_product',
        params: { id, unitBestPrice, name: undefined, brand: undefined, unit: undefined, unitConversions: undefined, remark: undefined },
      })
    }

    if (/(删除|移除)/.test(m) && /产品|商品|价目/.test(m)) {
      const idMatch = m.match(/id\s*(\d+)/i) ?? m.match(/产品id\s*(\d+)/)
      const id = idMatch?.[1] ?? '12'
      calls.push({ name: 'delete_product', params: { id } })
    }
  }

  if (isProxyRule && /代理|规则|Clash|RULE|Proxy/i.test(m)) {
    calls.push({ name: 'get_clash_rule_config', params: { type: 'Proxy' } })
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
  if (calls.length === 0 && isPrices) {
    calls.push({ name: 'list_price_lists', params: {} })
  }
  if (calls.length === 0 && isProxyRule) {
    calls.push({ name: 'get_clash_rule_config', params: { type: 'Proxy' } })
  }
  /**
   * iOS bundle id module intentionally disabled upstream; do not infer its tool calls here.
   */

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
async function callMcpTool(name: string, params: Record<string, unknown>, executePath: string): Promise<unknown> {
  const res = await fetch(executePath, {
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
      <div className="flex flex-col gap-2">
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
  const [endpoint, setEndpoint] = useState<PlaygroundEndpoint>('tools')
  const [scopeMode, setScopeMode] = useState<ScopeMode>(defaultToolsCategory ? 'category' : 'all')
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>(
    TOOL_CATEGORIES.includes(defaultToolsCategory as ToolCategory) ? (defaultToolsCategory as ToolCategory) : TOOL_CATEGORIES[0]
  )
  const [includesText, setIncludesText] = useState(defaultToolsCategory || TOOL_CATEGORIES.join(','))

  const normalizedIncludes = includesText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const effectiveCategory = scopeMode === 'category' ? selectedCategory : ''
  const toolsPath =
    scopeMode === 'all'
      ? '/api/function-calling/tools'
      : scopeMode === 'category'
        ? `/api/function-calling/${selectedCategory}/tools`
        : `/api/function-calling/tools?includes=${encodeURIComponent(normalizedIncludes.join(','))}`
  const mcpExecutePath =
    scopeMode === 'all'
      ? '/api/mcp'
      : scopeMode === 'category'
        ? `/api/mcp?includes=${encodeURIComponent(selectedCategory)}`
        : `/api/mcp?includes=${encodeURIComponent(normalizedIncludes.join(','))}`

  const allowedToolNames =
    scopeMode === 'category'
      ? (TOOL_NAMES_BY_CATEGORY[selectedCategory] ?? [])
      : scopeMode === 'includes'
        ? normalizedIncludes.flatMap((category) => TOOL_NAMES_BY_CATEGORY[category] ?? [])
        : []

  const promptCategory =
    scopeMode === 'category' ? selectedCategory : scopeMode === 'includes' ? (normalizedIncludes.find((category) => PRESET_PROMPTS_BY_CATEGORY[category]?.length) ?? '') : ''

  const presetPrompts = PRESET_PROMPTS_BY_CATEGORY[promptCategory] ?? PRESET_PROMPTS_BY_CATEGORY['']

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
    const url = toolsPath
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
      const inferred = mockInferToolCalls(text, effectiveCategory)
      const toolCalls = allowedToolNames.length > 0 ? inferred.filter((tc) => allowedToolNames.includes(tc.name)) : inferred
      const calls = toolCalls.length > 0 ? toolCalls : inferred
      const results: unknown[] = []
      for (const tc of calls) {
        const result = await callMcpTool(tc.name, tc.params, mcpExecutePath)
        results.push(result)
      }
      const duration = performance.now() - startedAt
      setChatDurationMs(duration)
      setChatStatus(200)

      const reply = mockFormatReply(calls, results)
      setChatReply(reply)
      setChatResponseBody(
        JSON.stringify(
          {
            message: { role: 'assistant', content: reply },
            flow: { tool_calls: calls, tool_results: results, scope: scopeMode, includes: normalizedIncludes },
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
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden bg-gray-100">
        <div className="flex shrink-0 flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>{endpoint === 'tools' ? `GET ${toolsPath}` : 'POST /api/function-calling/chat (mock flow via /api/mcp)'}</span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Scope</span>
              <FormSelect
                value={scopeMode}
                onChange={(value) => setScopeMode(value as ScopeMode)}
                options={[
                  { value: 'all', label: 'All modules' },
                  { value: 'category', label: 'Single module category' },
                  { value: 'includes', label: 'Selected modules (includes)' },
                ]}
              />
            </label>
            {scopeMode === 'category' ? (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-700">Category</span>
                <FormSelect
                  value={selectedCategory}
                  onChange={(value) => setSelectedCategory(value as ToolCategory)}
                  options={TOOL_CATEGORIES.map((category) => ({ value: category, label: category }))}
                />
              </label>
            ) : null}
            {scopeMode === 'includes' ? (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-700">Includes (comma-separated)</span>
                <input
                  type="text"
                  value={includesText}
                  onChange={(event) => setIncludesText(event.target.value)}
                  className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-900"
                  placeholder="holiday,exchange-rate,prices"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Endpoint</span>
              <FormSelect
                value={endpoint}
                onChange={(value) => setEndpoint(value as PlaygroundEndpoint)}
                options={[
                  { value: 'tools', label: `GET ${toolsPath}` },
                  { value: 'chat', label: 'POST /api/function-calling/chat (mock)' },
                ]}
              />
            </label>

            {endpoint === 'tools' ? (
              <div className="flex flex-wrap items-center gap-2">
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
            ) : (
              <>
                <p className="text-[11px] text-gray-600">Preset prompts:</p>
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
              </>
            )}
          </div>
        </div>

        <div className="flex min-h-[200px] min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Response</span>
            {endpoint === 'tools' ? (
              toolsStatus !== undefined ? (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">HTTP {toolsStatus}</span>
              ) : null
            ) : chatStatus !== undefined ? (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">HTTP {chatStatus}</span>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {endpoint === 'tools' ? renderToolsResponseContent(toolsError, toolsResponseBody) : renderChatResponseContent(chatError, chatReply, chatResponseBody)}
          </div>
        </div>
      </div>
    </div>
  )
}
