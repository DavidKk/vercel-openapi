'use client'

import { useEffect, useState } from 'react'

/**
 * Persist React state into localStorage.
 * @param key Storage key
 * @param defaultValue Default state value
 * @returns State tuple
 */
export function useLocalStorageState<T>(key: string, defaultValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const token = `LOCAL_STORAGE_STATE_TOKEN_${key}`
  const [state, setState] = useState<T>(() => (typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue))

  useEffect(() => {
    const content = localStorage.getItem(token)
    if (!(typeof content === 'string' && content.length > 0)) {
      return
    }

    try {
      const data = JSON.parse(content) as T
      setState(data)
    } catch {
      // ignore invalid persisted value
    }
  }, [token])

  useEffect(() => {
    try {
      localStorage.setItem(token, JSON.stringify(state))
    } catch {
      // ignore storage write failure
    }
  }, [state, token])

  return [state, setState]
}
