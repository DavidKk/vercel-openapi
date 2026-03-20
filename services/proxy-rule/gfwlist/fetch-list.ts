import { fetchWithCache } from '@/services/fetch'
import { createLogger } from '@/services/logger'

import { GFW_LIST_URL } from './constants'
import { type GFWRule, parseGFWList } from './parse'

const logger = createLogger('proxy-rule-gfwlist')

/**
 * Decode base64 text to UTF-8 string (Edge-safe).
 */
function decodeBase64Utf8(b64: string): string {
  const normalized = b64.replace(/\s/g, '')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * Fetch and parse gfwlist rules. In development returns [] unless PROXY_RULE_FETCH_GFWLIST_IN_DEV=1.
 */
export async function fetchGfwListRules(): Promise<GFWRule[]> {
  if (process.env.NODE_ENV === 'development' && process.env.PROXY_RULE_FETCH_GFWLIST_IN_DEV !== '1') {
    return []
  }

  try {
    const response = await fetchWithCache(GFW_LIST_URL)
    const text = new TextDecoder('utf-8').decode(response)
    const decoded = decodeBase64Utf8(text)
    return parseGFWList(decoded)
  } catch (error) {
    logger.fail('fetchGfwListRules failed', { error })
    throw error
  }
}
