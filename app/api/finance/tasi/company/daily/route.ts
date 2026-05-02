/**
 * Legacy path. Same handler as GET /api/finance/market/company/daily (generic `market` query; **TASI only** today).
 */
export const runtime = 'edge'

export { GET } from '../../../market/company/daily/route'
