import { NextResponse } from 'next/server'

import { applyCacheControlDebugOverride } from './cache-control'
import { standardResponseError, standardResponseSuccess } from './standard'
import type { ResponseInit, StandardResponse } from './types'

/** Return NextResponse.json with standard envelope and status 200. */
export function json(data: StandardResponse, options: ResponseInit = {}) {
  const headers = new Headers(options.headers)
  applyCacheControlDebugOverride(headers)
  return NextResponse.json(data, { status: 200, ...options, headers })
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
