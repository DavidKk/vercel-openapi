/**
 * Legacy path. Same handler as GET /api/finance/market/summary/daily (generic `market` query; **TASI only** today).
 */
export const runtime = 'edge'

export { GET } from '../../../market/summary/daily/route'
