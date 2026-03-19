import { serialize } from 'cookie'

import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
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

  return jsonSuccess(null, { headers })
})

export const GET = api(async () => {
  const session = await getAuthSession()
  return jsonSuccess(session)
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
  return jsonSuccess(null, { headers })
})
