import classNames from 'classnames'
import type { ButtonHTMLAttributes } from 'react'

/** Visual style for {@link Button}. */
export type ButtonVariant = 'primary' | 'secondary' | 'outline'

/** Size scale; `xs` is the smallest control (compact padding + 11px text). */
export type ButtonSize = 'xs' | 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Default `secondary` */
  variant?: ButtonVariant
  /** Default `md` */
  size?: ButtonSize
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'border border-gray-900 bg-gray-900 text-white hover:bg-gray-800',
  secondary: 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  xs: 'min-h-0 px-2 py-1 text-[11px] leading-tight',
  sm: 'px-2.5 py-1.5 text-xs leading-tight',
  md: 'px-3 py-2 text-sm',
}

/**
 * Shared action button (aligned with doc/playground controls: gray borders, compact sizes).
 * @param props Native button props plus variant and size
 * @returns Styled `<button>`
 */
export function Button(props: ButtonProps) {
  const { className, variant = 'secondary', size = 'md', type = 'button', ...rest } = props
  return (
    <button
      type={type}
      className={classNames(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className
      )}
      {...rest}
    />
  )
}
