import { useCallback, useState } from 'react'

/**
 * Generic async action hook with loading and error state.
 * @param action Async action function
 * @param deps Extra dependencies
 * @returns Executor with loading and error
 */
export function useAction<T extends any[], R>(action: (...params: T) => Promise<R>, deps: any[] = []) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(
    async (...params: T): Promise<R | undefined> => {
      setLoading(true)
      setError(null)
      try {
        return await action(...params)
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [action, ...deps]
  )

  return [execute, loading, error] as const
}
