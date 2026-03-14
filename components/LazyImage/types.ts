import type { SVGProps } from 'react'

/**
 * Props for PosterPlaceholder component (error/empty state)
 */
export interface PosterPlaceholderProps extends SVGProps<SVGSVGElement> {
  /** Main text, e.g. "Poster Unavailable" */
  title?: string
  /** Subtitle text, e.g. "Click to retry" */
  subtitle?: string
}
