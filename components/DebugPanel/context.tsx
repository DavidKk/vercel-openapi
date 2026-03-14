'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/** Default error message shown when "Force error" is enabled in debug panel. */
export const DEFAULT_DEBUG_ERROR_MESSAGE = 'This area is not supported for this service.'

/** Allowed switch ids for the debug panel; only these can be registered. */
export const DEBUG_SWITCH_IDS = ['forceLoading', 'forceError'] as const
export type DebugSwitchId = (typeof DEBUG_SWITCH_IDS)[number]

/** Allowed button ids; only these can be registered. */
export const DEBUG_BUTTON_IDS = [] as const
export type DebugButtonId = (typeof DEBUG_BUTTON_IDS)[number]

export interface DebugPanelState {
  forceLoading: boolean
  forceError: string | null
  errorMessage: string
  setForceLoading: (value: boolean) => void
  setForceError: (value: string | null) => void
  setErrorMessage: (value: string) => void
}

interface DebugPanelContextValue extends DebugPanelState {
  /** Number of active consumers; panel is visible when > 0. */
  consumerCount: number
  /** Call on mount when this tree uses debug. */
  registerConsumer: () => void
  /** Call on unmount. */
  unregisterConsumer: () => void
}

const DebugPanelContext = createContext<DebugPanelContextValue | null>(null)

export interface DebugPanelProviderProps {
  children: React.ReactNode
}

/**
 * Global debug panel provider. Register once at app root. Panel visibility is driven by
 * consumers: only when at least one consumer has registered is the floating panel shown.
 *
 * Multiple modules can register at once: consumerCount is ref-counted (increment on mount,
 * decrement on unmount). Panel stays visible until the last consumer unmounts. All consumers
 * share the same global state (forceLoading, forceError); toggles affect every consumer that
 * reads them.
 */
export function DebugPanelProvider(props: DebugPanelProviderProps) {
  const { children } = props
  const [forceLoading, setForceLoading] = useState(false)
  const [forceError, setForceError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState(DEFAULT_DEBUG_ERROR_MESSAGE)
  const [consumerCount, setConsumerCount] = useState(0)

  const registerConsumer = useCallback(() => {
    setConsumerCount((c) => c + 1)
  }, [])
  const unregisterConsumer = useCallback(() => {
    setConsumerCount((c) => Math.max(0, c - 1))
  }, [])

  const state: DebugPanelContextValue = {
    forceLoading,
    forceError,
    errorMessage,
    setForceLoading: useCallback((v: boolean) => setForceLoading(v), []),
    setForceError: useCallback((v: string | null) => setForceError(v), []),
    setErrorMessage: useCallback((v: string) => setErrorMessage(v), []),
    consumerCount,
    registerConsumer,
    unregisterConsumer,
  }

  return <DebugPanelContext.Provider value={state}>{children}</DebugPanelContext.Provider>
}

/**
 * Use debug overrides and register this subtree as a consumer. When mounted, the global
 * debug panel becomes visible; when unmounted, it is hidden if no other consumer is active.
 * Returns null if used outside DebugPanelProvider.
 *
 * Safe when multiple modules use this: each mount increments the ref-count, each unmount
 * decrements it; cleanup uses a ref so the correct unregister runs even if context identity
 * changes. Shared state (forceLoading, forceError) is global and applies to all consumers.
 */
export function useDebugPanel(): DebugPanelState | null {
  const ctx = useContext(DebugPanelContext)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  useEffect(() => {
    const c = ctxRef.current
    if (!c) return
    c.registerConsumer()
    return () => c.unregisterConsumer()
  }, [])

  if (!ctx) return null
  return {
    forceLoading: ctx.forceLoading,
    forceError: ctx.forceError,
    errorMessage: ctx.errorMessage,
    setForceLoading: ctx.setForceLoading,
    setForceError: ctx.setForceError,
    setErrorMessage: ctx.setErrorMessage,
  }
}

/** Internal hook for the panel to read consumer count and visibility. */
export function useDebugPanelVisibility(): { visible: boolean; state: DebugPanelContextValue | null } {
  const ctx = useContext(DebugPanelContext)
  return {
    visible: Boolean(ctx && ctx.consumerCount > 0),
    state: ctx,
  }
}
