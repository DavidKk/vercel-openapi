/**
 * Singleton request: only one in-flight request per key; N concurrent callers
 * with the same key share the same promise (one network request).
 */

/** In-flight promises by request key. Cleared when the promise settles. */
const inFlight = new Map<string, Promise<unknown>>()

/**
 * Run an async operation as a singleton per key. Only one execution per key at a time;
 * additional callers with the same key receive the same promise until it settles.
 * After the promise settles, the key is removed so the next caller can start a new request.
 *
 * @param requestKey Unique key for this logical request (e.g. "weather:forecast:22.96:113.11")
 * @param requestFn Async function that performs the request (e.g. fetch + parse). Called at most once per key until it settles.
 * @returns Promise that resolves or rejects with the result of requestFn
 */
export function withSingletonRequest<T>(requestKey: string, requestFn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(requestKey)
  if (existing != null) {
    return existing as Promise<T>
  }

  const promise = requestFn().finally(() => {
    inFlight.delete(requestKey)
  })

  inFlight.set(requestKey, promise)
  return promise as Promise<T>
}

/**
 * Build a stable request key for deduplication. Same URL + method + body produces the same key.
 *
 * @param url Request URL
 * @param method HTTP method (default "POST")
 * @param body Optional JSON-serializable body (object or string) for POST
 * @returns Key string for use with withSingletonRequest
 */
export function buildRequestKey(url: string, method = 'POST', body?: unknown): string {
  const bodyPart = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)
  return `${method}:${url}:${bodyPart}`
}
