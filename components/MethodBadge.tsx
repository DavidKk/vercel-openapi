/** Base classes for method badge; color added by method type */
const METHOD_BADGE_BASE = 'rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight'

/** Tailwind classes per HTTP method (bg + text). Unknown methods fall back to gray. */
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800',
  POST: 'bg-amber-100 text-amber-800',
  PUT: 'bg-sky-100 text-sky-800',
  PATCH: 'bg-violet-100 text-violet-800',
  DELETE: 'bg-red-100 text-red-800',
  HEAD: 'bg-gray-100 text-gray-700',
  OPTIONS: 'bg-gray-100 text-gray-700',
}

export interface MethodBadgeProps {
  /** HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS); case-insensitive */
  method: string
}

/**
 * Badge that shows HTTP method with method-specific color.
 * GET=emerald, POST=amber, PUT=sky, PATCH=violet, DELETE=red; others=gray.
 */
export function MethodBadge(props: MethodBadgeProps) {
  const { method } = props
  const key = method.toUpperCase()
  const colorClass = METHOD_COLORS[key] ?? 'bg-gray-100 text-gray-700'
  return <span className={`${METHOD_BADGE_BASE} ${colorClass}`}>{method.toUpperCase()}</span>
}
