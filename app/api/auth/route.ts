import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
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
