import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import { buildMergedClashRulePayload } from '@/services/proxy-rule/merge-payload'

export const runtime = 'edge'

const logger = createLogger('api-proxy-rule-clash-config')

/**
 * Public read-only: merged Clash RULE-SET payload lines for a given action (e.g. Proxy).
 * Query: type (required) — filter by rule action, case-insensitive.
 */
export const GET = api(async (req) => {
  const type = req.nextUrl.searchParams.get('type')?.trim()
  if (!type) {
    return jsonInvalidParameters('type query parameter is required (e.g. type=Proxy)')
  }

  try {
    logger.info('request', { type })
    const payload = await buildMergedClashRulePayload(type)
    const payloadText = payload.join('\n')
    return jsonSuccess(
      { payload, payloadText },
      {
        headers: new Headers({
          'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=300',
        }),
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.fail('buildMergedClashRulePayload failed', { message })
    return jsonSuccess({ error: message, payload: [] as string[] }, { status: 503 })
  }
})
