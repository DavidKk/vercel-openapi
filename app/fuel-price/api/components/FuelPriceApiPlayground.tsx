'use client'

import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { FormSelect } from '@/components/FormSelect'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

type FuelPriceEndpoint = 'all' | 'province' | 'promo'

interface FuelPriceApiState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  endpoint: FuelPriceEndpoint
  province: string
  fuelType: string
  amount: string
  bonus: string
}

/**
 * Client-side playground for fuel-price REST APIs.
 * Supports all three endpoints via dropdown and relevant inputs.
 */
export function FuelPriceApiPlayground() {
  const [state, setState] = useState<FuelPriceApiState>({
    loading: false,
    endpoint: 'all',
    province: '北京',
    fuelType: 'b92',
    amount: '200',
    bonus: '10',
  })

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { endpoint, province, fuelType, amount, bonus } = state
    let url: string
    if (endpoint === 'all') {
      url = '/api/fuel-price'
    } else if (endpoint === 'province') {
      if (!province.trim()) {
        setState((prev) => ({ ...prev, error: 'Province is required' }))
        return
      }
      url = `/api/fuel-price/${encodeURIComponent(province.trim())}`
    } else {
      if (!province.trim()) {
        setState((prev) => ({ ...prev, error: 'Province is required' }))
        return
      }
      if (!amount.trim()) {
        setState((prev) => ({ ...prev, error: 'amount is required' }))
        return
      }
      if (!bonus.trim()) {
        setState((prev) => ({ ...prev, error: 'bonus is required' }))
        return
      }
      const params = new URLSearchParams({ fuelType: fuelType || 'b92', amount: amount.trim(), bonus: bonus.trim() })
      url = `/api/fuel-price/${encodeURIComponent(province.trim())}/promo?${params.toString()}`
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
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

  const { loading, status, durationMs, error, responseBody, endpoint, province, fuelType, amount, bonus } = state

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />

      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>GET /api/fuel-price</span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Endpoint</span>
              <FormSelect
                value={endpoint}
                onChange={(v) => setState((prev) => ({ ...prev, endpoint: v as FuelPriceEndpoint }))}
                options={[
                  { value: 'all', label: 'All provinces' },
                  { value: 'province', label: 'Single province' },
                  { value: 'promo', label: 'Recharge promo' },
                ]}
              />
            </label>
            {(endpoint === 'province' || endpoint === 'promo') && (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-700">Province</span>
                <input
                  type="text"
                  className="h-7 rounded border border-gray-300 bg-white px-2 font-mono text-[11px] text-gray-900"
                  value={province}
                  onChange={(e) => setState((prev) => ({ ...prev, province: e.target.value }))}
                  placeholder="北京"
                />
              </label>
            )}
            {endpoint === 'promo' && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">fuelType</span>
                  <FormSelect
                    value={fuelType}
                    onChange={(v) => setState((prev) => ({ ...prev, fuelType: v }))}
                    options={[
                      { value: 'b92', label: 'b92' },
                      { value: 'b95', label: 'b95' },
                      { value: 'b98', label: 'b98' },
                      { value: 'b0', label: 'b0' },
                    ]}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">amount</span>
                  <input
                    type="text"
                    className="h-7 rounded border border-gray-300 bg-white px-2 font-mono text-[11px] text-gray-900"
                    value={amount}
                    onChange={(e) => setState((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="200"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">bonus</span>
                  <input
                    type="text"
                    className="h-7 rounded border border-gray-300 bg-white px-2 font-mono text-[11px] text-gray-900"
                    value={bonus}
                    onChange={(e) => setState((prev) => ({ ...prev, bonus: e.target.value }))}
                    placeholder="10"
                  />
                </label>
              </>
            )}
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
            {error ? (
              <pre className="text-red-600">{error}</pre>
            ) : responseBody ? (
              <JsonViewer value={responseBody} />
            ) : (
              <span className="text-gray-500">No response yet. Choose endpoint and send a request.</span>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
