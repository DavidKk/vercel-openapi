import { cookies } from 'next/headers'

import { verifyToken } from '@/utils/jwt'

import { AUTH_TOKEN_NAME } from './constants'

export interface AuthSession {
  authenticated: boolean
  username: string | null
}

/**
 * Resolve current auth session from HttpOnly cookie.
 * @returns Current session with authenticated flag and username
 */
export async function getAuthSession(): Promise<AuthSession> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_TOKEN_NAME)?.value

  if (!token) {
    return { authenticated: false, username: null }
  }

  const payload = await verifyToken(token)
  if (!payload || payload.authenticated !== true) {
    return { authenticated: false, username: null }
  }

  const username = typeof payload.username === 'string' ? payload.username : (process.env.ACCESS_USERNAME ?? null)
  return { authenticated: true, username }
}
