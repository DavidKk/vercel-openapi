import fs from 'fs'
import path from 'path'
import { parseTasiCompaniesDaily } from '@/app/api/finance/tasi/parseTasiDaily'

describe('parseTasiCompaniesDaily', () => {
  it('should parse tasi daily', async () => {
    const file = path.join(__dirname, 'DetailedDaily_en.html')
    const htmlContent = await fs.promises.readFile(file, { encoding: 'utf-8' })
    const result = parseTasiCompaniesDaily(htmlContent)
    expect(result.length).toEqual(259)
    expect(result[0]).toEqual({
      no: null,
      code: '',
      name: 'SARCO',
      lastPrice: 57.85,
      changePercent: -0.43,
      change: -0.249829,
      volume: 48743,
      turnover: 2829925.5,
      amplitude: 1.3769,
      high: 58.5,
      low: 57.7,
      open: 58,
      prevClose: 58.099829,
      volumeRatio: null,
      turnoverRate: 0.3261,
      peRatio: null,
      pbRatio: null,
      marketCap: 867750000,
      circulatingMarketCap: null,
      numberOfTrades: 469,
      speed: null,
      change_5m: null,
      change_60d: null,
      change_ytd: null,
      date: '2025-08-18',
    })
  })
})
