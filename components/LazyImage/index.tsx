'use client'

import { useEffect, useRef, useState } from 'react'

import { Spinner } from '@/components/Spinner'

import { PosterPlaceholder } from './PosterPlaceholder'
import type { PosterPlaceholderProps } from './types'

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Force load immediately (bypass IntersectionObserver).
   * Use when visibility is controlled elsewhere (e.g. swipe index).
   */
  forceLoad?: boolean
  /** Custom placeholder text for error state */
  placeholderProps?: Pick<PosterPlaceholderProps, 'title' | 'subtitle'>
}

/**
 * Lazy-loading image with viewport detection, loading state, and error retry.
 * Uses IntersectionObserver (with rootMargin) to load when near viewport.
 */
export function LazyImage({ src, alt, className = '', forceLoad, placeholderProps, ...props }: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [shouldLoad, setShouldLoad] = useState(forceLoad ?? false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (forceLoad) {
      setShouldLoad(true)
      return
    }
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '0% 0% 100% 0%', threshold: 0.01 }
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [forceLoad])

  useEffect(() => {
    if (shouldLoad) {
      setIsLoading(true)
      setHasError(false)
    }
  }, [src, shouldLoad])

  useEffect(() => {
    if (!shouldLoad) return
    const check = () => {
      const img = imgRef.current
      if (!img) return
      if (img.complete) {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setIsLoading(false)
          setHasError(false)
        } else {
          setIsLoading(false)
          setHasError(true)
        }
      }
    }
    check()
    const rafId = requestAnimationFrame(check)
    return () => cancelAnimationFrame(rafId)
  }, [src, retryKey, shouldLoad])

  function handleLoad() {
    setIsLoading(false)
    setHasError(false)
  }

  function handleError() {
    setIsLoading(false)
    setHasError(true)
  }

  function handleRetry() {
    setHasError(false)
    setIsLoading(true)
    setRetryKey((k) => k + 1)
  }

  const imageSrc = shouldLoad ? src : undefined

  return (
    <div ref={containerRef} className="relative h-full w-full" style={{ contentVisibility: forceLoad ? 'visible' : 'auto' }}>
      <div
        className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200"
        style={{
          opacity: isLoading && shouldLoad ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
          pointerEvents: isLoading && shouldLoad ? 'auto' : 'none',
        }}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center">
          <Spinner color="text-gray-500" />
        </span>
      </div>

      {hasError && shouldLoad && (
        <div
          className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center transition-opacity hover:opacity-90"
          onClick={handleRetry}
          style={{ opacity: hasError ? 1 : 0, transition: 'opacity 0.3s ease-in' }}
        >
          <PosterPlaceholder title={placeholderProps?.title} subtitle={placeholderProps?.subtitle ?? 'Click to retry'} className="h-full w-full" />
        </div>
      )}

      {shouldLoad && (
        <img
          ref={imgRef}
          key={retryKey}
          src={imageSrc}
          alt={alt}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoading || hasError ? 0 : 1,
            transition: 'opacity 0.2s ease-in, transform 160ms ease-in',
          }}
          {...props}
        />
      )}
    </div>
  )
}
