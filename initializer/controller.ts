/**
 * Route handler wrappers: api (JSON), plainText, buffer, cron. Injects context (params, searchParams) and request context.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { ensureCronAuthorized } from '@/services/auth/cron'
import { getHeaders, runWithContext } from '@/services/context'

import { isStandardResponse, standardResponseError, stringifyUnknownError } from './response'

/** Base context passed to handlers (params, search string, searchParams). */
export interface Context {
  params: Promise<any>
  search: string
  searchParams: URLSearchParams
}

/** Context with typed route params. */
export interface ContextWithParams<P> extends Context {
  params: Promise<P>
}

/** Wraps a handler that returns a JSON-serializable object; responds with NextResponse.json, merges context headers, 500 on throw. */
export function api<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<Record<string, any>>) {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    return runWithContext(req, async () => {
      try {
        const enhancedContext: ContextWithParams<P> = {
          params: context.params,
          search: req.nextUrl.search,
          searchParams: req.nextUrl.searchParams,
        }
        const result = await handle(req, enhancedContext)
        if (result instanceof NextResponse) {
          return result
        }

        const status = 'status' in result ? result.status : 200
        const inputHeaders = 'headers' in result ? result.headers : {}
        const collectHeaders = getHeaders()
        const headers = { ...collectHeaders, ...inputHeaders }
        return NextResponse.json(result, { status, headers })
      } catch (error) {
        if (error instanceof NextResponse) {
          return error
        }

        const result = (() => {
          if (isStandardResponse(error)) {
            return error
          }

          const message = stringifyUnknownError(error)
          return standardResponseError(message)
        })()

        return NextResponse.json(result, { status: 500 })
      }
    })
  }
}

/** Wraps a handler that returns a string; responds with plain text, 500 on throw. */
export function plainText<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<string | NextResponse>) {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    return runWithContext(req, async () => {
      try {
        const enhancedContext: ContextWithParams<P> = {
          params: context.params,
          search: req.nextUrl.search,
          searchParams: req.nextUrl.searchParams,
        }
        const result = await handle(req, enhancedContext)
        const headers = getHeaders()
        if (result instanceof NextResponse) {
          return result
        }

        return new NextResponse(result, { status: 200, headers })
      } catch (error) {
        const message = stringifyUnknownError(error)
        return new NextResponse(message, { status: 500 })
      }
    })
  }
}

/** Wraps a handler that returns an ArrayBuffer; responds with binary body, 500 on throw. */
export function buffer<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<ArrayBuffer | NextResponse>) {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    return runWithContext(req, async () => {
      try {
        const enhancedContext: ContextWithParams<P> = {
          params: context.params,
          search: req.nextUrl.search,
          searchParams: req.nextUrl.searchParams,
        }
        const result = await handle(req, enhancedContext)
        const headers = getHeaders()
        if (result instanceof NextResponse) {
          return result
        }
        return new NextResponse(result, { status: 200, headers })
      } catch (error) {
        const message = stringifyUnknownError(error)
        return new NextResponse(message, { status: 500 })
      }
    })
  }
}

/**
 * Cron job handler wrapper. Uses CRON_SECRET (Bearer or ?secret=); delegates to api().
 *
 * @param handle Handler that returns a JSON-serializable result
 * @returns Next.js route handler
 */
export function cron<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<Record<string, any>>) {
  return api(async (req: NextRequest, context: ContextWithParams<P>) => {
    await ensureCronAuthorized(req)
    return handle(req, context)
  })
}
