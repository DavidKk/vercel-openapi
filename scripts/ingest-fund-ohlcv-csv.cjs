/**
 * CLI: ingest Eastmoney-shaped OHLCV CSV (Chinese headers) into Turso `finance_market_daily_ohlcv`.
 * Skips rows whose `(symbol, date, source)` already exists (`INSERT OR IGNORE`).
 *
 * Usage:
 *   pnpm finance:ingest-ohlcv-csv -- --csv <path-to.csv> --symbol <six-digit>
 *   pnpm finance:ingest-ohlcv-csv -- -c <path-to.csv> -s <six-digit> --replace
 *
 * Symbol must always be passed explicitly (never inferred from the filename).
 *
 * Loads `.env.local` then `.env` from the repo root when variables are unset.
 */

const path = require('node:path')
const fs = require('node:fs')
const { createClient } = require('@libsql/client')

const TABLE_NAME = 'finance_market_daily_ohlcv'
const WRITE_CHUNK_SIZE = 80

/**
 * Merge env keys from a dotenv-style file into `process.env` when missing.
 *
 * @param {string} filePath Absolute path to `.env` / `.env.local`
 */
function loadEnvFileIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 1) continue
    const key = t.slice(0, eq).replace(/^export\s+/i, '').trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = val
    }
  }
}

/**
 * Parse one CSV line into a daily record (same column order as Eastmoney kline API).
 *
 * @param {string} symbol Six-digit market symbol
 * @param {string} line Comma-separated data row (no header)
 * @returns {Record<string, unknown> | null}
 */
function parseEastmoneyKlineRow(symbol, line) {
  const cells = line.split(',')
  if (cells.length < 11) return null
  const [date, open, close, high, low, volume, amount, amplitude, changeRate, changeAmount, turnoverRate] = cells
  const parsed = {
    date,
    symbol,
    open: Number(open),
    close: Number(close),
    high: Number(high),
    low: Number(low),
    volume: Number(volume),
    amount: Number(amount),
    amplitude: Number(amplitude),
    changeRate: Number(changeRate),
    changeAmount: Number(changeAmount),
    turnoverRate: Number(turnoverRate),
    source: 'eastmoney',
    isPlaceholder: Number(volume) === 0 || (Number(amplitude) === 0 && Number(amount) === 0),
  }
  if (!parsed.date || Number.isNaN(parsed.open) || Number.isNaN(parsed.close)) return null
  return parsed
}

/**
 * Ensure `finance_market_daily_ohlcv` exists (same DDL as server Turso module).
 *
 * @param {import('@libsql/client').Client} db LibSQL client
 * @returns {Promise<void>}
 */
async function ensureMarketDailyTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      source TEXT NOT NULL,
      payload TEXT NOT NULL,
      PRIMARY KEY (symbol, date, source)
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_date ON ${TABLE_NAME}(date)`)
}

/**
 * @template T
 * @param {T[]} arr
 * @param {number} size
 * @returns {T[][]}
 */
function chunkArray(arr, size) {
  if (arr.length === 0) return []
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Insert or replace rows.
 *
 * @param {import('@libsql/client').Client} db
 * @param {Record<string, unknown>[]} records
 * @param {boolean} replace Whether to overwrite existing `(symbol,date,source)` rows
 * @returns {Promise<{ attempted: number; inserted: number; skipped: number }>}
 */
async function writeMarketDailyRecords(db, records, replace) {
  const attempted = records.length
  if (attempted === 0) return { attempted: 0, inserted: 0, skipped: 0 }
  await ensureMarketDailyTable(db)
  let inserted = 0
  const verb = replace ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE'
  const chunks = chunkArray(records, WRITE_CHUNK_SIZE)
  for (const chunk of chunks) {
    const valuesSql = chunk.map(() => '(?, ?, ?, ?)').join(', ')
    const args = []
    for (const rec of chunk) {
      args.push(rec.symbol, rec.date, rec.source, JSON.stringify(rec))
    }
    const rs = await db.execute({
      sql: `${verb} INTO ${TABLE_NAME} (symbol, date, source, payload) VALUES ${valuesSql}`,
      args,
    })
    const affected = typeof rs.rowsAffected === 'number' ? rs.rowsAffected : 0
    inserted += affected
  }
  return { attempted, inserted, skipped: attempted - inserted }
}

/**
 * @param {string} line
 * @returns {boolean}
 */
function isOhlcvCsvHeaderLine(line) {
  const s = line.trim()
  return s.includes('日期') && s.includes('开盘') && s.includes('收盘')
}

/**
 * Parse `--csv` / `-c` and `--symbol` / `-s` from argv (both required), plus optional `--replace`.
 *
 * @param {string[]} argv Process argv slice after node script (e.g. `process.argv.slice(2)`)
 * @returns `{ csvPath: string, symbol: string, replace: boolean }` or `{ error: string }`
 */
function parseCliArgs(argv) {
  /** @type {string | undefined} */
  let csvPath
  /** @type {string | undefined} */
  let symbol
  let replace = false
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--') {
      continue
    }
    if (a === '--csv' || a === '-c') {
      csvPath = argv[i + 1]
      i += 1
      continue
    }
    if (a === '--symbol' || a === '-s') {
      symbol = argv[i + 1]
      i += 1
      continue
    }
    if (a === '--replace') {
      replace = true
      continue
    }
    if (a === '--help' || a === '-h') {
      return { error: 'help' }
    }
    return { error: `Unexpected argument: ${a}` }
  }
  if (!csvPath || !csvPath.trim()) {
    return { error: 'Missing --csv <path> (or -c).' }
  }
  if (!symbol || !/^\d{6}$/.test(symbol.trim())) {
    return { error: 'Missing or invalid --symbol <six-digit> (or -s).' }
  }
  return { csvPath: csvPath.trim(), symbol: symbol.trim(), replace }
}

/**
 * @param {string} symbol
 * @param {string[]} lines
 * @returns {Record<string, unknown>[]}
 */
function parseOhlcvCsv(symbol, lines) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byDate = new Map()
  let start = 0
  if (lines.length > 0 && isOhlcvCsvHeaderLine(lines[0])) {
    start = 1
  }
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (!line) continue
    const rec = parseEastmoneyKlineRow(symbol, line)
    if (!rec) continue
    byDate.set(rec.date, rec)
  }
  return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v)
}

async function main() {
  const root = path.join(__dirname, '..')
  loadEnvFileIfPresent(path.join(root, '.env.local'))
  loadEnvFileIfPresent(path.join(root, '.env'))

  const parsed = parseCliArgs(process.argv.slice(2))
  if ('error' in parsed) {
    if (parsed.error === 'help') {
      // eslint-disable-next-line no-console
      console.log(`Usage:
  pnpm finance:ingest-ohlcv-csv -- --csv <path-to.csv> --symbol <six-digit>
  pnpm finance:ingest-ohlcv-csv -- -c <path-to.csv> -s <six-digit> --replace

Example:
  pnpm finance:ingest-ohlcv-csv -- --csv ./510300.csv --symbol 510300 --replace`)
      return
    }
    // eslint-disable-next-line no-console
    console.error(parsed.error)
    // eslint-disable-next-line no-console
    console.error('Run with --help for usage.')
    process.exitCode = 1
    return
  }

  const { csvPath, symbol, replace } = parsed

  if (!fs.existsSync(csvPath)) {
    // eslint-disable-next-line no-console
    console.error(`CSV not found: ${csvPath}`)
    process.exitCode = 1
    return
  }

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url || !authToken) {
    // eslint-disable-next-line no-console
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN (set in .env.local or environment).')
    process.exitCode = 1
    return
  }

  const raw = fs.readFileSync(csvPath, 'utf8')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const records = parseOhlcvCsv(symbol, lines)

  if (records.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('No rows parsed — check CSV format matches Eastmoney kline columns.')
    process.exitCode = 1
    return
  }

  const db = createClient({ url, authToken })
  const { attempted, inserted, skipped } = await writeMarketDailyRecords(db, records, replace)

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        symbol,
        csvPath,
        attempted,
        inserted,
        skipped,
        replace,
        message:
          replace
            ? `Replaced/upserted ${inserted} row(s).`
            : inserted > 0
            ? `Inserted ${inserted} new row(s); ${skipped} already present or ignored.`
            : skipped === attempted
              ? 'All rows already existed (same symbol/date/source).'
              : 'Done.',
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
