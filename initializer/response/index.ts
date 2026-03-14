/**
 * Shared response helpers for API routes: standard JSON shape (code, message, data), NextResponse builders, and Cache-Control.
 */
import { NextResponse } from 'next/server'

/** Standard API response envelope. */
export interface StandardResponse {
  code: number
  message: string
  data: any
}

/** Optional fields when building a standard response. */
export interface StandardResponseInit {
  code?: number
  message?: string
  data?: any
}

/** StandardResponse with toJsonResponse / toTextResponse helpers. */
export interface StandardResponseEnhancer extends StandardResponse {
  toJsonResponse: (this: StandardResponse, status: number, options?: ResponseInit) => NextResponse<StandardResponse>
  toTextResponse: (this: StandardResponse, status: number, options?: ResponseInit) => NextResponse<string>
}

/** Build a standard response object with toJsonResponse / toTextResponse. */
export function standardResponse(init?: StandardResponseInit) {
  const { code = 0, message = 'ok', data = null } = init || {}

  return Object.defineProperties<StandardResponseEnhancer>({ code, message, data } as any, {
    toJsonResponse: {
      enumerable: false,
      configurable: false,
      value(status: number, options: ResponseInit = {}) {
        const { code, message, data } = this

        const headers = new Headers()
        options.headers?.forEach((value, key) => {
          headers.set(key, value)
        })

        headers.set('Content-Type', 'application/json; charset=utf-8')

        return NextResponse.json({ code, message, data }, { status, ...options, headers })
      },
    },
    toTextResponse: {
      enumerable: false,
      configurable: false,
      value(status: number, options: ResponseInit = {}) {
        const { message } = this

        const headers = new Headers()
        options.headers?.forEach((value, key) => {
          headers.set(key, value)
        })

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

/** Options for json/jsonSuccess (status and headers). */
export interface ResponseInit {
  status?: number
  headers?: Headers
}

/** Return NextResponse.json with standard envelope and status 200. */
export function json(data: StandardResponse, options: ResponseInit = {}) {
  return NextResponse.json(data, { status: 200, ...options })
}

/** Success JSON response: envelope with code 0 and given data. */
export function jsonSuccess(data?: any, options: ResponseInit = {}) {
  const response = standardResponseSuccess(data)
  return json(response, { status: 200, ...options })
}

/** JSON 404 response (not found). */
export function josnNotFound(options: ResponseInit = {}) {
  const response = standardResponseError('not found', { code: 404 })
  return json(response, { status: 404, ...options })
}

/** Turn unknown error into a string message (standard response, Error, or string). */
export function stringifyUnknownError(error: unknown) {
  if (isStandardResponse(error)) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return JSON.stringify(error)
}

export interface ErrorResponseInit extends ResponseInit {
  code?: number
}

/** Error response for invalid parameters (code 1000). */
export function invalidParameters(message = 'invalid parameters') {
  return standardResponseError(message, { code: 1000 })
}

/** Error response for unauthorized (code 2000). */
export function unauthorized(message = 'unauthorized') {
  return standardResponseError(message, { code: 2000 })
}

/** 400 plain-text invalid parameters. */
export function textInvalidParameters(message: string, options: ResponseInit = {}) {
  return invalidParameters(message).toTextResponse(400, options)
}

/** 401 plain-text unauthorized. */
export function textUnauthorized(message = 'unauthorized', options: ResponseInit = {}) {
  return unauthorized(message).toTextResponse(401, options)
}

/** 400 JSON invalid parameters. */
export function jsonInvalidParameters(message: string, options: ErrorResponseInit = {}) {
  return invalidParameters(message).toJsonResponse(400, options)
}

/** 401 JSON unauthorized. */
export function jsonUnauthorized(message = 'unauthorized', options: ErrorResponseInit = {}) {
  return unauthorized(message).toJsonResponse(401, options)
}

export { CACHE_CONTROL_LONG_LIVED, CACHE_MAX_AGE_ONE_YEAR_S } from './cache-control'
