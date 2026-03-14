'use client'

import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

type WeatherEndpoint = 'now' | 'forecast'

interface WeatherApiState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  endpoint: WeatherEndpoint
  latitude: string
  longitude: string
  granularity: 'hourly' | 'daily'
  hours: string
  days: string
}

/**
 * Client-side playground for the Weather REST API.
 * Allows testing POST /api/weather and POST /api/weather/forecast with simple point-based inputs.
 * @returns Weather API playground component
 */
export function WeatherApiPlayground() {
  const [state, setState] = useState<WeatherApiState>({
    loading: false,
    endpoint: 'now',
    latitude: '23.13',
    longitude: '113.27',
    granularity: 'hourly',
    hours: '6',
    days: '3',
  })

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const latitude = parseFloat(state.latitude)
    const longitude = parseFloat(state.longitude)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setState((prev) => ({ ...prev, error: 'Invalid latitude or longitude' }))
      return
    }

    const body: Record<string, unknown> = {
      latitude,
      longitude,
    }

    let url = '/api/weather'

    if (state.endpoint === 'forecast') {
      url = '/api/weather/forecast'
      body.granularity = state.granularity

      if (state.granularity === 'hourly' && state.hours.trim()) {
        const hours = Number.parseInt(state.hours, 10)
        if (!Number.isNaN(hours)) {
          body.hours = hours
        }
      }

      if (state.granularity === 'daily' && state.days.trim()) {
        const days = Number.parseInt(state.days, 10)
        if (!Number.isNaN(days)) {
          body.days = days
        }
      }
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
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

  const { loading, status, durationMs, error, responseBody, endpoint, latitude, longitude, granularity, hours, days } = state

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />

      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>{endpoint === 'now' ? 'POST /api/weather' : 'POST /api/weather/forecast'}</span>
          </div>
          <div className="space-y-2 px-3 py-2 text-[11px] text-gray-700">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded border px-2 py-1 text-[11px] ${
                  endpoint === 'now' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setState((prev) => ({ ...prev, endpoint: 'now' }))}
              >
                Now
              </button>
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded border px-2 py-1 text-[11px] ${
                  endpoint === 'forecast' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setState((prev) => ({ ...prev, endpoint: 'forecast' }))}
              >
                Forecast
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-700">latitude</span>
                <input
                  type="text"
                  className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                  value={latitude}
                  onChange={(e) => setState((prev) => ({ ...prev, latitude: e.target.value }))}
                  placeholder="23.13"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-700">longitude</span>
                <input
                  type="text"
                  className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                  value={longitude}
                  onChange={(e) => setState((prev) => ({ ...prev, longitude: e.target.value }))}
                  placeholder="113.27"
                />
              </label>
            </div>

            {endpoint === 'forecast' && (
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">granularity</span>
                  <select
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                    value={granularity}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        granularity: e.target.value as 'hourly' | 'daily',
                      }))
                    }
                  >
                    <option value="hourly">hourly</option>
                    <option value="daily">daily</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">hours</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                    value={hours}
                    onChange={(e) => setState((prev) => ({ ...prev, hours: e.target.value }))}
                    placeholder="6"
                    disabled={granularity !== 'hourly'}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">days</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                    value={days}
                    onChange={(e) => setState((prev) => ({ ...prev, days: e.target.value }))}
                    placeholder="3"
                    disabled={granularity !== 'daily'}
                  />
                </label>
              </div>
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
              <span className="text-gray-500">No response yet. Enter latitude and longitude, then send a request.</span>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
