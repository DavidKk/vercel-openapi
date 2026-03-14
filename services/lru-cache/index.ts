/**
 * In-memory LRU (least recently used) cache.
 * Uses Map insertion order; evicts the oldest entry when at capacity.
 * Reusable across services (china-geo, weather, etc.).
 */

export interface LruCache<K, V> {
  /**
   * Get value by key. Returns undefined on miss.
   * On hit, entry is marked recently used (moved to end of order).
   * @param key Cache key
   * @returns Cached value or undefined
   */
  get(key: K): V | undefined

  /**
   * Set value for key. Evicts oldest entry if at capacity and key is new.
   * @param key Cache key
   * @param value Value to store
   */
  set(key: K, value: V): void

  /**
   * Snapshot of all [key, value] pairs for iteration (e.g. point-in-bbox lookup).
   * Does not mutate LRU order.
   * @returns Array of [key, value] pairs
   */
  entries(): Array<[K, V]>
}

/**
 * Create an in-memory LRU cache with a fixed maximum size.
 * When full, the least recently used entry is evicted on the next set.
 *
 * @param maxSize Maximum number of entries to keep
 * @returns LRU cache with get/set
 */
export function createLruCache<K, V>(maxSize: number): LruCache<K, V> {
  const cache = new Map<K, V>()

  return {
    get(key: K): V | undefined {
      const value = cache.get(key)
      if (value === undefined) return undefined
      cache.delete(key)
      cache.set(key, value)
      return value
    },

    set(key: K, value: V): void {
      if (cache.size >= maxSize && !cache.has(key)) {
        const firstKey = cache.keys().next().value
        if (firstKey !== undefined) cache.delete(firstKey)
      }
      cache.set(key, value)
    },

    entries(): Array<[K, V]> {
      return Array.from(cache.entries())
    },
  }
}
