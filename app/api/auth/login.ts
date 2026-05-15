'use server'

import { serialize } from 'cookie'

import { verify2fa } from '@/services/2fa'
import { AUTH_TOKEN_NAME } from '@/services/auth/constants'
import { createLogger } from '@/services/logger'
import { generateToken, getLoginJwtExpiresIn, jwtExpiresInToMaxAgeSeconds } from '@/utils/jwt'

const logger = createLogger('auth-login')

/**
 * Validates credentials and returns a Set-Cookie header value for the session JWT.
 * @param username Submitted username
 * @param password Submitted password
 * @param token Optional TOTP when 2FA is enabled
 * @param rememberMe When false, issues a shorter (1 day) session; when true, uses `JWT_EXPIRES_IN`
 * @returns Object with `cookie` set to the serialized `Set-Cookie` header value
 */
export async function login(username: string, password: string, token?: string, rememberMe = true) {
  if (!username) {
    throw new Error('Username is required')
  }

  if (!password) {
    throw new Error('Password is required')
  }

  if (process.env.ACCESS_USERNAME !== username || process.env.ACCESS_PASSWORD !== password) {
    throw new Error('Invalid username or password')
  }

  const secret = process.env.ACCESS_2FA_SECRET
  if (secret && !(token && (await verify2fa({ token, secret })))) {
    logger.warn('Invalid 2FA token')
    throw new Error('Invalid username or password')
  }

  const expiresIn = getLoginJwtExpiresIn(rememberMe)
  const authToken = await generateToken({ authenticated: true, username }, expiresIn)
  const maxAge = jwtExpiresInToMaxAgeSeconds(expiresIn)
  const cookie = serialize(AUTH_TOKEN_NAME, authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge,
    path: '/',
    sameSite: 'lax',
  })

  return { cookie }
}
