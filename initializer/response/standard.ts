import { NextResponse } from 'next/server'

import { applyCacheControlDebugOverride } from './cache-control'
import type { StandardResponse, StandardResponseInit } from './types'

/** StandardResponse with toJsonResponse / toTextResponse helpers. */
export interface StandardResponseEnhancer extends StandardResponse {
  toJsonResponse: (this: StandardResponse, status: number, options?: globalThis.ResponseInit) => NextResponse<StandardResponse>
  toTextResponse: (this: StandardResponse, status: number, options?: globalThis.ResponseInit) => NextResponse<string>
}

/** Build a standard response object with toJsonResponse / toTextResponse. */
export function standardResponse(init?: StandardResponseInit) {
  const { code = 0, message = 'ok', data = null } = init || {}

  return Object.defineProperties<StandardResponseEnhancer>({ code, message, data } as any, {
    toJsonResponse: {
      enumerable: false,
      configurable: false,
      value(status: number, options: globalThis.ResponseInit = {}) {
        const { code, message, data } = this
        const headers = new Headers(options.headers)
        applyCacheControlDebugOverride(headers)
        headers.set('Content-Type', 'application/json; charset=utf-8')

        return NextResponse.json({ code, message, data }, { status, ...options, headers })
      },
    },
    toTextResponse: {
      enumerable: false,
      configurable: false,
      value(status: number, options: globalThis.ResponseInit = {}) {
        const { message } = this
        const headers = new Headers(options.headers)
        applyCacheControlDebugOverride(headers)
        headers.set('Content-Type', 'text/plain; charset=utf-8')

        return new NextResponse(message, { status, ...options, headers })
      },
    },
  })
}

/** Type guard for standard response shape. */
export function isStandardResponse(data: any): data is StandardResponse {
  return data && typeof data === 'object' && typeof data.code === 'number' && typeof data.message === 'string'
}

/** Success response: code 0, message 'ok', optional data. */
export function standardResponseSuccess(data?: any): StandardResponse {
  return standardResponse({ code: 0, message: 'ok', data })
}

/** Error response: custom message and optional code/data. */
export function standardResponseError(message: string, init?: Omit<StandardResponseInit, 'message'>) {
  const { code = 1, data = null } = init || {}
  return standardResponse({ code, message, data })
}
