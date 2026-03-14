'use client'

import { Spinner } from '@/components/Spinner'

import { LoadingEllipsis } from './LoadingEllipsis'

export interface LoadingMessageProps {
  /** Short name of what is loading, e.g. "fuel prices", "TASI data". Shown as "Loading {message} for you..." */
  message: string
  /** Optional extra hint below the main line */
  hint?: string
  /** Spinner color (Tailwind text class). Default gray for light backgrounds. */
  spinnerColor?: string
}

/**
 * Centered loading state: Spinner + "Loading {message} for you" with animated ellipsis.
 * Use in Overview loaders instead of plain "Loading…".
 */
export function LoadingMessage(props: LoadingMessageProps) {
  const { message, hint, spinnerColor = 'text-gray-500' } = props

  return (
    <div className="flex min-h-[72px] flex-col items-center justify-center gap-2 text-center">
      <div className="flex items-center gap-2">
        <Spinner color={spinnerColor} />
        <p className="flex items-center text-sm font-medium text-gray-600">
          <span>Loading {message} for you</span>
          <LoadingEllipsis />
        </p>
      </div>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}
