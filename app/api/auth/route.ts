import { serialize } from 'cookie'

import { api } from '@/initializer/controller'
import { CACHE_CONTROL_NO_STORE, jsonSuccess } from '@/initializer/response'
import { AUTH_TOKEN_NAME } from '@/services/auth/constants'
import { getAuthSession } from '@/services/auth/session'
import { createLogger } from '@/services/logger'

import { login } from './login'

const logger = createLogger('api-auth')

export const POST = api(async (req) => {
  const { username, password, token } = await req.json()
  logger.info('login request', { username: username ? '(present)' : undefined })
  const { cookie } = await login(username, password, token)

  const headers = new Headers()
  headers.append('Set-Cookie', cookie)
  headers.set('Cache-Control', CACHE_CONTROL_NO_STORE)

  return jsonSuccess(null, { headers })
})

export const GET = api(async () => {
  const session = await getAuthSession()
  const headers = new Headers({ 'Cache-Control': CACHE_CONTROL_NO_STORE })
  return jsonSuccess(session, { headers })
})

export const DELETE = api(async () => {
  const headers = new Headers()
  headers.append(
    'Set-Cookie',
    serialize(AUTH_TOKEN_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    })
  )
  headers.set('Cache-Control', CACHE_CONTROL_NO_STORE)
  return jsonSuccess(null, { headers })
})
