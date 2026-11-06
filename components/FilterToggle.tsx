'use client'

import type { AriaAttributes, ReactNode } from 'react'

export interface FilterToggleProps {
  /** Whether the control is in the on / active state */
  pressed: boolean
  /** Called with the next pressed state when the control is clicked */
  onPressedChange: (pressed: boolean) => void
  children: ReactNode
  /** `switch` for filters; `button` when expressing an attached action state */
  role?: 'switch' | 'button'
  /** Active accent; default brand (gray-900) matches console density */
  activeTone?: 'brand' | 'warning'
  /** Accessible name; falls back to string children when omitted */
  'aria-label'?: string
  title?: string
  disabled?: boolean
  className?: string
  'aria-expanded'?: AriaAttributes['aria-expanded']
  'aria-haspopup'?: AriaAttributes['aria-haspopup']
  'aria-controls'?: AriaAttributes['aria-controls']
}

/**
 * Resolve shell classes for idle / pressed / disabled states.
 * @param pressed Whether the toggle is active
 * @param disabled Whether the control is disabled
 * @param activeTone Active color tone
 * @returns Tailwind class string for the button shell
 */
function resolveShellClass(pressed: boolean, disabled: boolean, activeTone: 'brand' | 'warning'): string {
  if (disabled) {
    return 'border-gray-200 bg-gray-50 text-gray-400 shadow-none'
  }
  if (pressed) {
    if (activeTone === 'warning') {
      return 'border-amber-500/55 bg-amber-50 text-amber-800 shadow-none hover:border-amber-500/75 hover:bg-amber-100'
    }
    return 'border-gray-800/55 bg-gray-900/5 text-gray-900 shadow-none hover:border-gray-800/75 hover:bg-gray-900/10'
  }
  return 'border-gray-300 bg-white text-gray-700 shadow-sm hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900'
}

/**
 * Resolve the bottom indicator color.
 * @param pressed Whether the toggle is active
 * @param disabled Whether the control is disabled
 * @param activeTone Active color tone
 * @returns Tailwind background class for the indicator
 */
function resolveIndicatorClass(pressed: boolean, disabled: boolean, activeTone: 'brand' | 'warning'): string {
  if (disabled) return 'bg-gray-300/50'
  if (pressed) return activeTone === 'warning' ? 'bg-amber-600' : 'bg-gray-900'
  return 'bg-gray-300'
}

/**
 * Toolbar filter / state button with a short bottom indicator (ticket-janitor / CHAYA FilterToggle).
 * Outline control; active state changes border/text and shows a 2px bar under the label.
 * @param props Toggle configuration
 * @returns Filter toggle button
 */
export function FilterToggle(props: FilterToggleProps) {
  const {
    pressed,
    onPressedChange,
    children,
    role = 'switch',
    activeTone = 'brand',
    'aria-label': ariaLabel,
    title,
    disabled = false,
    className = '',
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHasPopup,
    'aria-controls': ariaControls,
  } = props

  const label = ariaLabel ?? (typeof children === 'string' ? children : undefined)

  return (
    <button
      type="button"
      role={role}
      aria-checked={role === 'switch' ? pressed : undefined}
      aria-pressed={role === 'button' ? pressed : undefined}
      aria-label={label}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      aria-controls={ariaControls}
      title={title}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={[
        'relative inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border px-3 text-xs font-medium leading-none transition-colors',
        'disabled:cursor-not-allowed',
        resolveShellClass(pressed, disabled, activeTone),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="relative z-[1]">{children}</span>
      <span
        aria-hidden
        className={`pointer-events-none absolute bottom-px left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full transition-colors ${resolveIndicatorClass(pressed, disabled, activeTone)}`}
      />
    </button>
  )
}
