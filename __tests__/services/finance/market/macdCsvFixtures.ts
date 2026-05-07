import fs from 'fs'
import path from 'path'

/** Directory holding committed OHLCV + MACD CSV fixtures for MACD regression tests (`__tests__/fixtures/...`) */
const FIXTURE_DIR = path.join(__dirname, '../../../fixtures/finance/market')

/**
 * One row of expected MACD columns from `macd-data-expected.csv` (legacy service export).
 */
export interface MacdExpectedCsvRow {
  /** Trading date `YYYY-MM-DD` */
  date: string
  /** Close column from `macd-data-expected.csv` (must match `510300-ohlcv.csv` for that date) */
  closeFromMacdCsv: number
  ema12: number
  ema26: number
  dif: number
  dea: number
  macd: number
}

/**
 * Load committed 510300 daily OHLCV CSV (Eastmoney-style columns).
 *
 * @returns Raw UTF-8 file contents
 */
export function load510300OhlcvFixture(): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, '510300-ohlcv.csv'), 'utf-8')
}

/**
 * Load committed MACD expected-output CSV (`均价,收盘,日期,EMA12,...`).
 *
 * @returns Raw UTF-8 file contents
 */
export function loadMacdExpectedFixture(): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, 'macd-data-expected.csv'), 'utf-8')
}

/**
 * Parse 510300 OHLCV CSV into a date → close map (column `收盘`).
 *
 * @param csv Raw CSV text
 * @returns Map keyed by `YYYY-MM-DD`
 */
export function parse510300CloseByDate(csv: string): Map<string, number> {
  const map = new Map<string, number>()
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  for (let i = 1; i < lines.length; i += 1) {
    const parts = lines[i].split(',')
    if (parts.length < 3) continue
    const date = parts[0].trim()
    const close = Number(parts[2])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(close)) continue
    map.set(date, close)
  }
  return map
}

/**
 * Parse MACD expected CSV rows (after header). Order is preserved (oldest → newest).
 *
 * @param csv Raw CSV text
 * @returns Expected indicator rows
 */
export function parseMacdExpectedRows(csv: string): MacdExpectedCsvRow[] {
  const rows: MacdExpectedCsvRow[] = []
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  for (let i = 1; i < lines.length; i += 1) {
    const parts = lines[i].split(',')
    if (parts.length < 8) continue
    const date = parts[2].trim()
    const closeFromMacdFile = Number(parts[1])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    rows.push({
      date,
      closeFromMacdCsv: closeFromMacdFile,
      ema12: Number(parts[3]),
      ema26: Number(parts[4]),
      dif: Number(parts[5]),
      dea: Number(parts[6]),
      macd: Number(parts[7]),
    })
  }
  return rows
}

/**
 * Build close series for MACD: for each expected row date, take close from 510300 OHLCV.
 * Also checks that 510300 close matches the reference close column in the MACD CSV (same source data).
 *
 * @param closeByDate Parsed 510300 map
 * @param expected Rows from `macd-data-expected.csv`
 * @returns Closes in chronological order matching `expected`
 */
export function buildClosesFrom510300ForMacdExpected(closeByDate: Map<string, number>, expected: MacdExpectedCsvRow[]): number[] {
  const closes: number[] = []
  for (const row of expected) {
    const from510300 = closeByDate.get(row.date)
    if (from510300 === undefined) {
      throw new Error(`Missing 510300 OHLCV row for date ${row.date}`)
    }

    closes.push(from510300)
  }
  return closes
}
