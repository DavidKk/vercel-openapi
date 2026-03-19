import { PRICES_API_SKILL_PROTECTED, PRICES_API_SKILL_PUBLIC } from '@/app/prices/skill-content'
import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { getAuthSession } from '@/services/auth/session'

export const runtime = 'edge'

/**
 * UI endpoint for prices skill content.
 * - When user is logged in: returns protected skill markdown (includes CURD/product-management section)
 * - When user is not logged in: returns public skill markdown only
 */
export const GET = api(async () => {
  const session = await getAuthSession()
  const content = session.authenticated ? PRICES_API_SKILL_PROTECTED : PRICES_API_SKILL_PUBLIC

  return jsonSuccess({ content })
})
