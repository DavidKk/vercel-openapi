'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

import { HIDDEN_ROUTES } from '@/app/Nav/constants'

/**
 * Whether the global Nav should be hidden for the current route (matches HIDDEN_ROUTES).
 */
export function useLayoutVisibility(): boolean {
  const pathname = usePathname()

  return useMemo(() => {
    if (!pathname) return false
    return HIDDEN_ROUTES.some((route) => pathname.startsWith(route))
  }, [pathname])
}
