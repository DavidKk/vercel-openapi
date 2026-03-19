'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MdOutlineAdminPanelSettings } from 'react-icons/md'
import { TbLogout, TbUserCircle } from 'react-icons/tb'

import { Tooltip } from '@/components/Tooltip'

interface SessionData {
  authenticated: boolean
  username: string | null
}

/**
 * Header auth entry: login icon when anonymous; user menu when authenticated.
 * @returns Auth control shown on the right side of global header
 */
export function AuthEntry() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const loadSession = useCallback(async () => {
    const response = await fetch('/api/auth', { method: 'GET', cache: 'no-store' })
    const result = await response.json().catch(() => null)
    const data = result?.data as SessionData | undefined
    if (!response.ok || !data) {
      setSession({ authenticated: false, username: null })
      return
    }
    setSession(data)
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession, pathname])

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [])

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    setMenuOpen(false)
    setSession({ authenticated: false, username: null })
    router.refresh()
  }

  if (!session) {
    return <span className="block h-9 w-9 shrink-0" aria-hidden="true" />
  }

  if (!session.authenticated) {
    return (
      <Tooltip content="Login">
        <Link
          href="/login"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="Login"
        >
          <MdOutlineAdminPanelSettings className="h-5 w-5" />
        </Link>
      </Tooltip>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <Tooltip content={session.username ?? 'Account'}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="Account"
          aria-expanded={menuOpen}
        >
          <TbUserCircle className="h-5 w-5" />
        </button>
      </Tooltip>
      {menuOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-md">
          <div className="px-2 pt-2 text-[10px] leading-tight text-gray-500">Signed in as</div>
          <div className="truncate whitespace-nowrap px-2 pb-2 pt-0.5 text-sm font-medium text-gray-900">{session.username ?? 'Unknown'}</div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <TbLogout className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
