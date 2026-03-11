'use client'

import { useState } from 'react'

import { FormSelect } from '@/components/FormSelect'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

type ExchangeRateToolName = 'get_exchange_rate' | 'convert_currency'

interface ExchangeRateMcpState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  tool: ExchangeRateToolName
  paramsText: string
}

/**
 * MCP playground for exchange-rate tools: get_exchange_rate, convert_currency.
 */
export function ExchangeRateMcpPlayground() {
  const [state, setState] = useState<ExchangeRateMcpState>({
    loading: false,
    tool: 'get_exchange_rate',
    paramsText: '{}',
  })

  function handleToolChange(value: string) {
    const tool = value as ExchangeRateToolName
    let nextParams = '{}'
    if (tool === 'get_exchange_rate') {
      nextParams = JSON.stringify({ base: 'USD' }, null, 2)
    } else if (tool === 'convert_currency') {
      nextParams = JSON.stringify({ from: 'USD', to: 'CNY', amount: 100 }, null, 2)
    }
    setState((prev) => ({ ...prev, tool, paramsText: nextParams }))
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
      const response = await fetch('/api/mcp', {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
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
      <PlaygroundPanelHeader badge="POST /api/mcp" />

      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="border-b border-gray-100 px-3 py-2 text-[11px] font-medium text-gray-800">Request</div>
          <div className="space-y-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1 text-[11px]">
              <span className="text-[11px] text-gray-700">Tool name</span>
              <FormSelect
                value={tool}
                onChange={handleToolChange}
                options={[
                  { value: 'get_exchange_rate', label: 'get_exchange_rate' },
                  { value: 'convert_currency', label: 'convert_currency' },
                ]}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px]">
              <span className="text-[11px] text-gray-700">Params (JSON)</span>
              <textarea
                className="h-28 resize-none rounded border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-900"
                spellCheck={false}
                value={paramsText}
                onChange={(e) => setState((prev) => ({ ...prev, paramsText: e.target.value }))}
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send request'}
              </button>
              {durationMs !== undefined && <span className="text-[10px] text-gray-500">{durationMs.toFixed(0)} ms</span>}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Response</span>
            {status !== undefined && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">HTTP {status}</span>}
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {error ? <pre className="text-red-600">{error}</pre> : responseBody ? <JsonViewer value={responseBody} /> : <span className="text-gray-500">No response yet.</span>}
          </div>
        </div>
      </form>
    </div>
  )
}
