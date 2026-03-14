/**
 * Auth wrappers: withAuthHandler for API routes (401 JSON), withAuthAction for server actions (redirect to login).
 */
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import type { Context } from '@/initializer/controller'
import { jsonUnauthorized } from '@/initializer/response'
import { validateCookie } from '@/services/auth/access'

/** Context with optional auth flag. */
export interface AuthContext extends Context {
  $$authorized?: boolean
}

/** Wraps an API handler; returns 401 JSON if cookie invalid, otherwise runs handle. */
export function withAuthHandler<C extends Context>(handle: (req: NextRequest, context: C & AuthContext) => Promise<any>) {
  return async (req: NextRequest, context: C & AuthContext) => {
    if (!(await validateCookie())) {
      return jsonUnauthorized()
    }

    return handle(req, context)
  }
}

/** Action type: callable + .$$ for the raw implementation. */
interface Action<A extends any[], R> {
  (...args: A): Promise<R>
  $$: (...args: A) => Promise<R>
}

/** Wraps a server action; redirects to /login if cookie invalid, otherwise runs request. */
export function withAuthAction<A extends any[], R>(request: (...args: A) => Promise<R>): Action<A, R> {
  const action = async (...args: A): Promise<R> => {
    if (!(await validateCookie())) {
      redirect('/login')
    }

    return request(...args)
  }

  action.$$ = request
  return action
}

/** Returns the raw action implementation (no auth check). */
export function trimAction<A extends any[], R>(action: Action<A, R>) {
  return action.$$
}
