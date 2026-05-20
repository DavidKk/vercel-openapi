'use client'

import { ModuleNavRegistrar } from '@/components/ModuleNavContext'

import type { DashboardSidebarItem } from './DashboardSidebar'

interface MobileModuleNavProps {
  items: DashboardSidebarItem[]
}

/**
 * @deprecated Mobile menu lives in the global app header. Use {@link ModuleNavRegistrar} via {@link DashboardSidebar}.
 * @param props Sidebar items for the current module
 * @returns Registrar only (no separate mobile bar)
 */
export function MobileModuleNav(props: Readonly<MobileModuleNavProps>) {
  return <ModuleNavRegistrar items={props.items} />
}
