'use client'

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

import { applyResolvedTheme, type ResolvedTheme, resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from '@/utils/theme/theme-preference'
import { readStoredTheme, writeStoredTheme } from '@/utils/theme/theme-storage'

interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemDark(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Theme runtime: preference (light/dark/auto), resolved theme, and DOM sync.
 * @param props Provider children
 * @returns Theme context provider
 */
export function ThemeProvider(props: Readonly<{ children: ReactNode }>) {
  const { children } = props
  const [preference, setPreferenceState] = useState<ThemePreference>('auto')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof document !== 'undefined' && (document.documentElement.dataset.theme === 'dark' || document.documentElement.dataset.theme === 'light')) {
      return document.documentElement.dataset.theme
    }
    return 'light'
  })

  useEffect(() => {
    const stored = readStoredTheme(browserStorage())
    setPreferenceState(stored)
    const next = resolveTheme(stored, systemDark())
    setResolvedTheme(next)
    applyResolvedTheme(next, document.documentElement)
  }, [])

  useEffect(() => {
    if (preference !== 'auto') return
    let media: MediaQueryList | null = null
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => {
        const next = resolveTheme('auto', media?.matches ?? false)
        setResolvedTheme(next)
        applyResolvedTheme(next, document.documentElement)
      }
      media.addEventListener('change', onChange)
      return () => media?.removeEventListener('change', onChange)
    } catch {
      return undefined
    }
  }, [preference])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return
      const nextPreference = event.newValue === 'light' || event.newValue === 'dark' || event.newValue === 'auto' ? event.newValue : 'auto'
      setPreferenceState(nextPreference)
      const next = resolveTheme(nextPreference, systemDark())
      setResolvedTheme(next)
      applyResolvedTheme(next, document.documentElement)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function setPreference(nextPreference: ThemePreference) {
    setPreferenceState(nextPreference)
    writeStoredTheme(browserStorage(), nextPreference)
    const next = resolveTheme(nextPreference, systemDark())
    setResolvedTheme(next)
    applyResolvedTheme(next, document.documentElement)
  }

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Access theme preference and setter.
 * @returns Theme context value
 */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}
