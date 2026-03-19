/**
 * Generic client-only IndexedDB cache factory.
 * All modules use a single shared database (SHARED_DB_NAME) with different object stores.
 */

export interface IdbCache<T> {
  /**
   * Get value by key. Returns null on miss, SSR, or when entry is past TTL.
   * @param key Cache key (e.g. grid key, "year:2024")
   * @returns Cached value or null
   */
  get(key: string): Promise<T | null>

  /**
   * Store value for key. No-op on SSR.
   * @param key Cache key
   * @param value Value to store (must be JSON-serializable)
   */
  set(key: string, value: T): Promise<void>

  /**
   * Return all non-expired entries. Use when lookup is by value (e.g. point-in-bbox) not by key.
   * @returns Array of { key, value } for entries within TTL
   */
  getAll(): Promise<Array<{ key: string; value: T }>>
}

/** Single IndexedDB database for the app; each module uses a different object store. */
export const SHARED_DB_NAME = 'unbnd-idb'

const SHARED_DB_VERSION = 5

/** Object store names in the shared DB. Use these with createIdbCache(SHARED_DB_NAME, storeName, ttl). */
export const IDB_STORES = {
  RATES: 'rates',
  FORECAST: 'forecast',
  TASI_COMPANY_DAILY: 'tasi_company_daily',
  TASI_MARKET_SUMMARY: 'tasi_market_summary',
  GEO_REGIONS: 'geo_regions',
  FUEL_PRICE: 'fuel_price',
  HOLIDAY_LIST: 'holiday_list',
  MOVIES: 'movies',
  PRICES: 'prices',
} as const

function openDb(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }
    const isShared = dbName === SHARED_DB_NAME
    const version = isShared ? SHARED_DB_VERSION : 1
    const req = window.indexedDB.open(dbName, version)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (isShared) {
        if (!db.objectStoreNames.contains(IDB_STORES.RATES)) {
          db.createObjectStore(IDB_STORES.RATES, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.FORECAST)) {
          db.createObjectStore(IDB_STORES.FORECAST, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.TASI_COMPANY_DAILY)) {
          const companyStore = db.createObjectStore(IDB_STORES.TASI_COMPANY_DAILY, { keyPath: 'date_code' })
          companyStore.createIndex('by_date', 'date', { unique: false })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.TASI_MARKET_SUMMARY)) {
          db.createObjectStore(IDB_STORES.TASI_MARKET_SUMMARY, { keyPath: 'date' })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.GEO_REGIONS)) {
          const geoStore = db.createObjectStore(IDB_STORES.GEO_REGIONS, { keyPath: 'key' })
          geoStore.createIndex('by_min_lng', 'minLng', { unique: false })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.FUEL_PRICE)) {
          db.createObjectStore(IDB_STORES.FUEL_PRICE, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.HOLIDAY_LIST)) {
          db.createObjectStore(IDB_STORES.HOLIDAY_LIST, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.MOVIES)) {
          db.createObjectStore(IDB_STORES.MOVIES, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(IDB_STORES.PRICES)) {
          db.createObjectStore(IDB_STORES.PRICES, { keyPath: 'key' })
        }
      } else {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'key' })
        }
      }
    }
  })
}

/**
 * Open the shared IndexedDB. Use when you need direct store access (e.g. finance TASI with date_code key).
 * Client-only; throws on SSR.
 */
export function openSharedDb(storeName: string): Promise<IDBDatabase> {
  return openDb(SHARED_DB_NAME, storeName)
}

/**
 * Create a TTL-based IndexedDB cache. Client-only; get/set no-op or return null on SSR.
 *
 * @param dbName IndexedDB database name (use SHARED_DB_NAME for app cache)
 * @param storeName Object store name (e.g. IDB_STORES.RATES)
 * @param ttlMs TTL in milliseconds; entries older than this are treated as miss
 * @returns Cache with get/set
 */
export function createIdbCache<T>(dbName: string, storeName: string, ttlMs: number): IdbCache<T> {
  return {
    async get(key: string): Promise<T | null> {
      if (typeof window === 'undefined' || !window.indexedDB) return null
      const db = await openDb(dbName, storeName)
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const req = store.get(key)
        req.onsuccess = () => {
          db.close()
          const row = req.result as { key: string; data: T; storedAt: number } | undefined
          if (!row?.data) {
            resolve(null)
            return
          }
          const age = Date.now() - (row.storedAt ?? 0)
          if (age > ttlMs) {
            resolve(null)
            return
          }
          resolve(row.data)
        }
        req.onerror = () => {
          db.close()
          reject(req.error)
        }
      })
    },

    async getAll(): Promise<Array<{ key: string; value: T }>> {
      if (typeof window === 'undefined' || !window.indexedDB) return []
      const db = await openDb(dbName, storeName)
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const req = store.getAll()
        req.onsuccess = () => {
          db.close()
          const now = Date.now()
          const rows = (req.result ?? []) as Array<{ key: string; data: T; storedAt: number }>
          const valid = rows.filter((row) => row?.data != null && now - (row.storedAt ?? 0) <= ttlMs)
          resolve(valid.map((row) => ({ key: row.key, value: row.data })))
        }
        req.onerror = () => {
          db.close()
          reject(req.error)
        }
      })
    },

    async set(key: string, value: T): Promise<void> {
      if (typeof window === 'undefined' || !window.indexedDB) return
      const db = await openDb(dbName, storeName)
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const req = store.put({ key, data: value, storedAt: Date.now() })
        req.onsuccess = () => {
          db.close()
          resolve()
        }
        req.onerror = () => {
          db.close()
          reject(req.error)
        }
      })
    },
  }
}
