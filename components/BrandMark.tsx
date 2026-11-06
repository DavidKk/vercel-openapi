'use client'

import classNames from 'classnames'
import Image from 'next/image'

interface BrandMarkProps {
  /** Outer layout size in pixels (CSS box). */
  size?: number
  /** Extra class names on the outer box. */
  className?: string
  /** When true, hint Next.js to prioritize loading. */
  priority?: boolean
}

/**
 * Unbnd brand mark: glyph always on top; white plate sits underneath.
 * Light: plate collapsed (invisible), glyph at full size.
 * Dark: plate expands from center, glyph scales down slightly — both transition together.
 *
 * @param props.size Outer layout size in pixels
 * @param props.className Extra class names on the outer box
 * @param props.priority Prefer early image load
 * @returns Brand mark element
 */
export function BrandMark(props: Readonly<BrandMarkProps>) {
  const { size = 40, className, priority = false } = props

  return (
    <span
      className={classNames('brand-mark relative inline-flex shrink-0 items-center justify-center overflow-visible rounded-md', className)}
      style={{ width: size, height: size }}
    >
      {/** White plate under the glyph — expands in dark, shrinks away in light. */}
      <span className="brand-mark__plate keep-light-surface pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden style={{ backgroundColor: '#ffffff' }} />
      <Image src="/brand-mark.png" alt="Unbnd" width={256} height={256} className="brand-mark__glyph relative z-[1] object-contain" priority={priority} />
    </span>
  )
}
