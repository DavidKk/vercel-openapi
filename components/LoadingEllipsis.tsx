'use client'

import { memo, useEffect, useRef, useState } from 'react'

/**
 * Animated ellipsis: cycles "." → ".." → "..." for loading states.
 * Use with "Loading X for you" text.
 */
export const LoadingEllipsis = memo(function LoadingEllipsis() {
  const [dots, setDots] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDots((d) => (d >= 3 ? 1 : d + 1))
    }, 400)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <span className="inline-block min-w-[1.25em] text-left" aria-hidden>
      {'.'.repeat(dots)}
    </span>
  )
})
