'use client'

import { useEffect } from 'react'

/**
 * Client-side error boundary for /holiday. Catches errors that occur during
 * client navigation (e.g. first load) and offers reset so user can recover
 * without full refresh.
 */
export default function HolidayError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log for debugging (browser console)
    console.error('Holiday segment error:', error.message, error.digest)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm text-gray-600">Something went wrong loading the calendar.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        Try again
      </button>
      <p className="text-xs text-gray-400">
        If it keeps happening, refresh the page or open the link in a new tab.
      </p>
    </div>
  )
}
