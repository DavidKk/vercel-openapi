/**
 * Generic client-only IndexedDB cache factory.
 * Use for any API response that should be cached by key with TTL (e.g. geo, holiday list).
 * Reduces repetition when multiple modules need the same "get/set by key, expire after TTL" pattern.
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

function openDb(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }
    const req = window.indexedDB.open(dbName, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'key' })
      }
    }
  })
}

/**
 * Create a TTL-based IndexedDB cache. Client-only; get/set no-op or return null on SSR.
 *
 * @param dbName IndexedDB database name (e.g. 'unbnd-geo')
 * @param storeName Object store name (e.g. 'geo')
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
