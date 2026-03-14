import type { NextRequest } from 'next/server'

export interface Context {
  headers: Headers
  req: NextRequest
  traceId: string
}

// Only create AsyncLocalStorage in server environment
let storage: any = null
if (typeof window === 'undefined') {
  const { AsyncLocalStorage } = require('node:async_hooks')
  storage = new (AsyncLocalStorage as any)()
}

function createTraceId(req: NextRequest): string {
  const fromHeader = req.headers.get('x-trace-id') ?? req.headers.get('x-request-id') ?? req.headers.get('traceparent')

  if (fromHeader) {
    return fromHeader
  }

  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function runWithContext<T>(req: NextRequest, fn: () => T): T {
  // Skip context operations in client environment
  if (typeof window !== 'undefined' || !storage) {
    return fn()
  }

  return storage.run(createContext(req), fn)
}

export function createContext(req: NextRequest): Context {
  const headers = new Headers()
  const traceId = createTraceId(req)
  headers.set('x-trace-id', traceId)
  return { req, headers, traceId }
}

export function getContext() {
  // Skip context operations in client environment
  if (typeof window !== 'undefined' || !storage) {
    return undefined
  }

  return storage.getStore()
}

/**
 * Get current trace identifier from request context if available.
 * @returns Trace id string or undefined when no context is active
 */
export function getTraceId(): string | undefined {
  const context = getContext() as Context | undefined
  return context?.traceId
}

type TrimFirst<T extends any[]> = T extends [any, ...infer B] ? B : never

export function withContext<T extends (ctx: Context, ...args: any[]) => any>(fn: T) {
  return (...args: TrimFirst<Parameters<T>>): ReturnType<T> | undefined => {
    if (typeof window !== 'undefined') {
      return
    }

    const context = getContext()
    if (!context) {
      return
    }

    return fn(context, ...args)
  }
}

export const getReqHeaders = withContext((ctx) => ctx.req.headers)

export const getHeaders = withContext((ctx) => ctx.headers)

export const setHeaders = withContext((ctx, headers: Headers | Record<string, string>) => {
  // Skip header operations in client environment
  if (typeof window !== 'undefined') {
    return
  }

  for (const [key, value] of Object.entries(headers)) {
    ctx.headers.set(key, value)
  }
})
