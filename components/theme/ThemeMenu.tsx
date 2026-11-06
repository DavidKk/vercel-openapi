'use client'

import { useEffect, useRef, useState } from 'react'
import { CgDarkMode } from 'react-icons/cg'
import { TbDeviceDesktop, TbMoon, TbSun } from 'react-icons/tb'

import { NAV_ICON_BTN_CLASS, NAV_ICON_BTN_INACTIVE_CLASS } from '@/app/Nav/constants'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Tooltip } from '@/components/Tooltip'
import type { ThemePreference } from '@/utils/theme/theme-preference'

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof TbSun }> = [
  { value: 'light', label: 'Light', icon: TbSun },
  { value: 'dark', label: 'Dark', icon: TbMoon },
  { value: 'auto', label: 'System', icon: TbDeviceDesktop },
]

/**
 * Header theme menu (light / dark / system) — same interaction pattern as ticket-janitor ThemeMenu.
 * @returns Theme toggle control for the global header
 */
export function ThemeMenu() {
  const { preference, setPreference } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <Tooltip content="Theme">
        <button
          type="button"
          aria-label="Theme"
          aria-expanded={open}
          aria-haspopup="menu"
          title="Theme"
          className={`${NAV_ICON_BTN_CLASS} ${NAV_ICON_BTN_INACTIVE_CLASS} ${open ? 'bg-gray-100 text-gray-900' : ''}`}
          onClick={() => setOpen((value) => !value)}
        >
          <CgDarkMode className="h-5 w-5" aria-hidden />
        </button>
      </Tooltip>
      {open ? (
        <div role="menu" aria-label="Theme" className="absolute right-0 z-50 mt-2 min-w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-md">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = preference === value
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs ${
                  selected ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => {
                  setPreference(value)
                  setOpen(false)
                }}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
