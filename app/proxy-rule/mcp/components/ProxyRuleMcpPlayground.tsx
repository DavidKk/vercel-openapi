'use client'

import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { CompactJsonViewer } from '@/components/CompactJsonViewer'
import { FormSelect } from '@/components/FormSelect'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

type ProxyRuleToolName = 'get_clash_rule_config'

interface ProxyRuleMcpState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  tool: ProxyRuleToolName
  paramsText: string
}

const MCP_PATH = '/api/mcp/proxy-rule'

/**
 * MCP playground for proxy-rule tools (POST /api/mcp/proxy-rule).
 */
export function ProxyRuleMcpPlayground() {
  const [state, setState] = useState<ProxyRuleMcpState>({
    loading: false,
    tool: 'get_clash_rule_config',
    paramsText: JSON.stringify({ type: 'Proxy' }, null, 2),
  })

  function handleToolChange(value: string) {
    const tool = value as ProxyRuleToolName
    setState((prev) => ({
      ...prev,
      tool,
      paramsText: JSON.stringify({ type: 'Proxy' }, null, 2),
    }))
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
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          tool: state.tool,
          params: parsedParams,
        }),
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
      <PlaygroundPanelHeader />

      <form onSubmit={handleSendRequest} className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100">
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-800">Tool</span>
              <FormSelect value={tool} onChange={handleToolChange} options={[{ value: 'get_clash_rule_config', label: 'get_clash_rule_config' }]} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-800">params (JSON)</span>
              <textarea
                value={paramsText}
                onChange={(e) => setState((prev) => ({ ...prev, paramsText: e.target.value }))}
                className="min-h-[120px] rounded-md border border-gray-300 bg-white p-2 font-mono text-[11px] text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="h-8 w-fit rounded-md bg-gray-900 px-3 text-xs font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Send'}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Response</span>
            {status !== undefined && (
              <span className={PLAYGROUND_HEADER_BADGE_CLASS}>
                {status}
                {durationMs !== undefined ? ` · ${durationMs.toFixed(0)}ms` : ''}
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
            {responseBody ? <CompactJsonViewer value={responseBody} /> : null}
          </div>
        </div>
      </form>
    </div>
  )
}
