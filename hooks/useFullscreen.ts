'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Manage fullscreen state for a target element.
 * @returns Fullscreen state, toggle handler and element ref
 */
export function useFullscreen<T extends HTMLElement = HTMLElement>() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const elementRef = useRef<T>(null)

  const toggleFullscreen = useCallback((element?: T) => {
    const targetElement = element || elementRef.current || document.documentElement
    if (!document.fullscreenElement) {
      targetElement
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true)
        })
        .catch(() => {
          setIsFullscreen(false)
        })
      return
    }

    document
      .exitFullscreen()
      .then(() => {
        setIsFullscreen(false)
      })
      .catch(() => {
        setIsFullscreen(!!document.fullscreenElement)
      })
  }, [])

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return { isFullscreen, toggleFullscreen, elementRef }
}
