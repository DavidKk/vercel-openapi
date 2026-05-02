/**
 * Legacy path. Same handler as GET /api/finance/market/summary/hourly (generic `market` query; **TASI only** today).
 */
export const runtime = 'nodejs'

export { GET } from '../../../market/summary/hourly/route'
