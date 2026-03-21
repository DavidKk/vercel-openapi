import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonSuccess } from '@/initializer/response'
import { resolveDns } from '@/services/dns'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-dns')

/** L0 cache: 1 minute for DNS results (same URL = cache hit). */
const CACHE_DNS = 'public, max-age=60, s-maxage=60, stale-while-revalidate=120'

/**
 * GET /api/dns — Query DNS for a domain (A + AAAA in one response).
 * Query: domain (required), dns (optional, default 1.1.1.1). Supports IP or DoH host.
 */
export const GET = api(async (req) => {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get('domain')?.trim()
  const dns = searchParams.get('dns')?.trim() || undefined

  if (!domain) {
    return jsonSuccess({ error: 'Missing or empty query parameter: domain' }, { status: 400, headers: cacheControlNoStoreHeaders() })
  }

  if (domain.length > 253) {
    return jsonSuccess({ error: 'Invalid domain' }, { status: 400, headers: cacheControlNoStoreHeaders() })
  }

  try {
    logger.info('request', { domain, dns: dns ?? '1.1.1.1' })
    const result = await resolveDns(domain, dns)
    const headers = new Headers({ 'Cache-Control': CACHE_DNS })
    return jsonSuccess(result, { headers })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DNS lookup failed'
    logger.fail('DNS lookup failed', { domain, dns: dns ?? '1.1.1.1', message })
    return jsonSuccess({ error: message, records: [], domain, dns: dns ?? '1.1.1.1' }, { status: 502, headers: cacheControlNoStoreHeaders() })
  }
})
