import type { ReactNode } from 'react'

import { CONTENT_PAGE_TITLE_CLASS } from '@/app/Nav/constants'

/** Page header shell: title row + toolbar; stacks on mobile, single row from `sm`. */
export const CONTENT_PAGE_HEADER_SHELL_CLASS = 'flex shrink-0 min-w-0 flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:gap-2'

/** Toolbar slot: filters/inputs on one row, actions wrap on the next (mobile-friendly). */
export const CONTENT_PAGE_HEADER_TOOLBAR_CLASS = 'flex min-w-0 w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-2'

/** Filter / search row inside the toolbar (full width on mobile). */
export const CONTENT_PAGE_HEADER_FILTERS_ROW_CLASS = 'flex min-w-0 w-full gap-2'

/** Action buttons row; wraps so Save/Export stay visible without horizontal scroll. */
export const CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS = 'flex flex-wrap gap-2'

/** Compact toolbar: horizontal scroll with a visible thin scrollbar (few controls only). */
export const CONTENT_PAGE_HEADER_TOOLBAR_SCROLL_CLASS =
  'flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:ml-auto sm:flex-nowrap sm:overflow-x-auto sm:whitespace-nowrap [scrollbar-width:thin]'

export interface ContentPageHeaderProps {
  /** Header title (string or element). */
  title: ReactNode
  /** Classes applied to the title wrapper. */
  titleClassName?: string
  /** Toolbar controls (filters, buttons). */
  children?: ReactNode
  /** Extra classes on the outer shell. */
  className?: string
}

/**
 * Responsive content page header for module overview/manage views.
 * Stacks title and toolbar on narrow viewports; aligns in one row from `sm` up.
 *
 * @param props Header props
 * @returns Header element
 */
export function ContentPageHeader(props: Readonly<ContentPageHeaderProps>) {
  const { title, titleClassName = CONTENT_PAGE_TITLE_CLASS, children, className = '' } = props
  const shellClass = [CONTENT_PAGE_HEADER_SHELL_CLASS, className].filter(Boolean).join(' ')

  return (
    <div className={shellClass}>
      <div className={titleClassName}>{title}</div>
      {children != null ? <div className={CONTENT_PAGE_HEADER_TOOLBAR_CLASS}>{children}</div> : null}
    </div>
  )
}
