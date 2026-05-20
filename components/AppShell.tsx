'use client'

import type { ReactNode } from 'react'

import { Nav } from '@/app/Nav'
import { ModuleNavProvider } from '@/components/ModuleNavContext'

interface AppShellProps {
  children: ReactNode
}

/**
 * App chrome: global header with module mobile menu + main content area.
 * @param props Shell children (route layouts/pages)
 * @returns Nav and scrollable main column
 */
export function AppShell(props: Readonly<AppShellProps>) {
  const { children } = props

  return (
    <ModuleNavProvider>
      <Nav />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </ModuleNavProvider>
  )
}
