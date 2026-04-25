import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess, yaml } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import { buildMergedClashRulePayload } from '@/services/proxy-rule/merge-payload'

export const runtime = 'edge'

const logger = createLogger('api-proxy-rule-clash-config')

/**
 * Escape scalar text for safe YAML single-quoted string output.
 * @param value Raw text content
 * @returns YAML-safe single-quoted scalar content
 */
function escapeYamlSingleQuoted(value: string): string {
  return value.replaceAll("'", "''")
}

/**
 * Public read-only: merged Clash RULE-SET payload lines for a given action (e.g. Proxy).
 * Query: type (required) — filter by rule action, case-insensitive.
 */
export const GET = api(async (req) => {
  const type = req.nextUrl.searchParams.get('type')?.trim()
  if (!type) {
    return jsonInvalidParameters('type query parameter is required (e.g. type=Proxy)', {
      headers: cacheControlNoStoreHeaders(),
    })
  }

  try {
    logger.info('request', { type })
    const payload = await buildMergedClashRulePayload(type)
    const yamlText = `payload:\n${payload.map((line) => `  - '${escapeYamlSingleQuoted(line)}'`).join('\n')}`
    return yaml(yamlText, {
      headers: new Headers({
        'Content-Type': 'application/yaml; charset=utf-8',
        'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=300',
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.fail('buildMergedClashRulePayload failed', { message })
    const failHeaders = cacheControlNoStoreHeaders()
    failHeaders.set('Content-Type', 'application/json')
    return jsonSuccess({ error: message, payload: [] as string[] }, { status: 503, headers: failHeaders })
  }
})
