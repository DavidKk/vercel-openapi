'use client'

import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { FormSelect } from '@/components/FormSelect'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

type FinanceMcpToolName =
  | 'get_market_company_daily'
  | 'get_market_summary_daily'
  | 'get_market_summary_hourly'
  | 'get_market_daily'
  | 'get_overview_stock_list'
  | 'get_stock_summary'

interface FinanceMcpPlaygroundState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  tool: FinanceMcpToolName
  paramsText: string
}

/** MCP endpoint for this module (POST /api/mcp/finance) */
const MCP_PATH = '/api/mcp/finance'

const DEFAULT_PARAMS: Record<FinanceMcpToolName, string> = {
  get_market_company_daily: '{"market":"TASI"}',
  get_market_summary_daily: '{"market":"TASI"}',
  get_market_summary_hourly: '{"market":"TASI"}',
  get_market_daily: '{"symbols":"518880","startDate":"2025-01-01","endDate":"2025-03-01"}',
  get_overview_stock_list: '{"symbols":"518880","startDate":"2025-01-01","endDate":"2025-03-01"}',
  get_stock_summary: '{"market":"TASI"}',
}

/**
 * MCP playground for Finance tools (market-aware TASI feed tools plus stock summary and market daily OHLCV).
 */
export function TasiMcpPlayground() {
  const [state, setState] = useState<FinanceMcpPlaygroundState>({
    loading: false,
    tool: 'get_market_company_daily',
    paramsText: DEFAULT_PARAMS.get_market_company_daily,
  })

  function handleToolChange(value: string) {
    const tool = value as FinanceMcpToolName
    setState((prev) => ({ ...prev, tool, paramsText: DEFAULT_PARAMS[tool] }))
  }

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      let parsedParams: unknown = {}
      if (state.paramsText.trim()) {
        parsedParams = JSON.parse(state.paramsText)
      }
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const response = await fetch(MCP_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ tool: state.tool, params: parsedParams }),
      })
      const durationMs = performance.now() - startedAt
      const text = await response.text()
      setState((prev) => ({
        ...prev,
        loading: false,
        status: response.status,
        durationMs,
        error: undefined,
        responseBody: text,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState((prev) => ({
        ...prev,
        loading: false,
        status: undefined,
        durationMs: undefined,
        error: message,
        responseBody: undefined,
      }))
    }
  }

  const { loading, status, durationMs, error, responseBody, tool, paramsText } = state

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />
      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>POST {MCP_PATH}</span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1">
              <span>Tool</span>
              <FormSelect
                value={tool}
                onChange={handleToolChange}
                options={[
                  { value: 'get_market_company_daily', label: 'get_market_company_daily' },
                  { value: 'get_market_summary_daily', label: 'get_market_summary_daily' },
                  { value: 'get_market_summary_hourly', label: 'get_market_summary_hourly' },
                  { value: 'get_market_daily', label: 'get_market_daily' },
                  { value: 'get_overview_stock_list', label: 'get_overview_stock_list' },
                  { value: 'get_stock_summary', label: 'get_stock_summary' },
                ]}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>
                params (JSON). TASI feed tools: optional <code className="rounded bg-gray-100 px-0.5">market</code> (default TASI). Company/summary daily: same modes as REST —{' '}
                <code className="rounded bg-gray-100 px-0.5">{'{}'}</code> latest, <code className="rounded bg-gray-100 px-0.5">{`{"date":"YYYY-MM-DD"}`}</code>, or K-line fields.{' '}
                <code className="rounded bg-gray-100 px-0.5">get_stock_summary</code>: <code className="rounded bg-gray-100 px-0.5">market</code> or{' '}
                <code className="rounded bg-gray-100 px-0.5">markets</code> (comma-separated). <code className="rounded bg-gray-100 px-0.5">get_market_daily</code>: symbols,
                startDate, endDate; optional <code className="rounded bg-gray-100 px-0.5">withIndicators</code>.
              </span>
              <textarea
                className="min-h-[80px] rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-[10px]"
                value={paramsText}
                onChange={(e) => setState((prev) => ({ ...prev, paramsText: e.target.value }))}
                spellCheck={false}
              />
            </label>
            <button
              type="submit"
              className="rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
            {durationMs != null && <span className="text-[10px] text-gray-500">{durationMs.toFixed(0)} ms</span>}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Response</span>
            {status != null && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono">HTTP {status}</span>}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2 text-[10px] text-gray-800">
            {error ? <pre className="text-red-600">{error}</pre> : responseBody ? <JsonViewer value={responseBody} /> : <span className="text-gray-500">No response yet.</span>}
          </div>
        </div>
      </form>
    </div>
  )
}
