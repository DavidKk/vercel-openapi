import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { parseTasiCompaniesDaily } from './parseTasiDaily'
import { DAILY_REPORT_HEADERS, DAILY_REPORT_URL } from './constants'
import { fetchWithCache } from '@/services/fetch'

export const runtime = 'edge'

export const GET = api(async () => {
  const records = await fetchTasiCompaniesDaily()
  return jsonSuccess(records, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    }),
  })
})

async function fetchTasiCompaniesDaily() {
  const htmlContent = await fetchDailyReport()
  return parseTasiCompaniesDaily(htmlContent)
}

async function fetchDailyReport() {
  const arrayBuffer = await fetchWithCache(DAILY_REPORT_URL, {
    method: 'GET',
    headers: { ...DAILY_REPORT_HEADERS },
  })

  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('utf8')
}
