import { NextResponse } from 'next/server'

import { applyCacheControlDebugOverride } from './cache-control'
import type { ResponseInit } from './types'

/**
 * Return YAML text response with cache-control debug override support.
 * @param text YAML content text
 * @param options Optional status and headers
 * @returns NextResponse with `application/yaml` content type
 */
export function yaml(text: string, options: ResponseInit = {}) {
  const headers = new Headers(options.headers)
  applyCacheControlDebugOverride(headers)
  headers.set('Content-Type', 'application/yaml; charset=utf-8')
  return new NextResponse(text, { status: 200, ...options, headers })
}
