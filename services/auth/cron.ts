import type { NextRequest } from 'next/server'

import { jsonUnauthorized } from '@/initializer/response'

/**
 * Ensure request is authorized for cron (CRON_SECRET).
 * If CRON_SECRET is set: requires Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.
 * If not set: allows (no auth).
 *
 * @param req Next request
 * @throws NextResponse 401 when secret is set and auth fails
 */
export async function ensureCronAuthorized(req: NextRequest): Promise<void> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return
  }

  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const querySecret = req.nextUrl.searchParams.get('secret')
  if (token !== secret && querySecret !== secret) {
    throw jsonUnauthorized('Unauthorized')
  }
}
