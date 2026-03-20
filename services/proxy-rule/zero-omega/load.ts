import { readGistFile } from '@/services/gist'
import { createLogger } from '@/services/logger'

import type { ZeroOmega } from './types'

const logger = createLogger('proxy-rule-zero-omega')

const DEFAULT_FILE = 'ZeroOmega.json'

/**
 * Load ZeroOmega JSON from a separate gist when env is configured; otherwise null.
 */
export async function loadZeroOmegaConfig(): Promise<ZeroOmega | null> {
  const gistId = process.env.ZERO_OMEGA_GIST_ID?.trim()
  const gistToken = process.env.ZERO_OMEGA_GIST_TOKEN?.trim()
  if (!gistId || !gistToken) {
    return null
  }

  const fileName = process.env.ZERO_OMEGA_GIST_FILENAME?.trim() || DEFAULT_FILE

  try {
    const content = await readGistFile({ gistId, gistToken, fileName })
    return JSON.parse(content) as ZeroOmega
  } catch (error) {
    logger.warn('loadZeroOmegaConfig failed', { error })
    return null
  }
}
