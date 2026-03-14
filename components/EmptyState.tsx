import type { ReactNode } from 'react'

export interface EmptyStateProps {
  /** Icon shown above the message (e.g. TbGasStation, TbCalendarSearch). Use larger size (e.g. h-12 w-12). */
  icon: ReactNode
  /** Short description, second line. */
  message: string
}

/**
 * No-data placeholder: icon on first line, message on second; centered horizontally and vertically.
 */
export function EmptyState(props: EmptyStateProps) {
  const { icon, message } = props
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex items-center justify-center text-gray-400" aria-hidden>
        {icon}
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}
