'use client'

import type { ReactNode } from 'react'

import { CONTENT_INSET_X_CLASS, CONTENT_INSET_Y_CLASS, CONTENT_PAGE_TITLE_CLASS } from '@/app/Nav/constants'
import { ScrollArea } from '@/components/ScrollArea'

/**
 * Page header shell: title + description on the left, toolbar on the same row.
 * Horizontal padding only ({@link CONTENT_INSET_X_CLASS}); vertical rhythm lives on the title row.
 */
export const CONTENT_PAGE_HEADER_SHELL_CLASS = `relative flex shrink-0 min-w-0 flex-col border-b border-gray-200 ${CONTENT_INSET_X_CLASS}`

/**
 * Title + toolbar row: equal vertical padding ({@link CONTENT_INSET_Y_CLASS}) and cross-axis centering.
 * Toolbar uses negative vertical margin so its ScrollArea still reaches `border-b` for the indicator.
 */
export const CONTENT_PAGE_HEADER_TITLE_ROW_CLASS = `flex min-w-0 w-full flex-nowrap items-center gap-3 ${CONTENT_INSET_Y_CLASS}`

/** Left column: title + description. */
export const CONTENT_PAGE_HEADER_TITLE_BLOCK_CLASS = 'min-w-0 shrink'

/** Description under the title — compact, secondary to bold title. */
export const CONTENT_PAGE_HEADER_DESCRIPTION_CLASS = 'mt-0.5 text-[11px] font-normal leading-tight text-gray-500'

/**
 * Toolbar host beside the title: horizontal Custom Scroll.
 * `self-stretch -my-2` cancels row padding so the 2px indicator can sit on `border-b`.
 */
export const CONTENT_PAGE_HEADER_TOOLBAR_CLASS = 'min-w-0 flex-1 self-stretch -my-2'

/** Inner filters + actions strip inside the toolbar ScrollArea (no wrap; width follows content, right-aligned). */
export const CONTENT_PAGE_HEADER_TOOLBAR_INNER_CLASS = 'ml-auto flex h-full w-max max-w-none flex-nowrap items-center gap-2'

/** Filter / search row inside the toolbar (no wrap; scrolls with the parent toolbar). */
export const CONTENT_PAGE_HEADER_FILTERS_ROW_CLASS = 'flex shrink-0 items-center gap-2'

/** Action buttons row (no wrap; scrolls with the parent toolbar). */
export const CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS = 'flex shrink-0 items-center gap-2'

/** Alias kept for existing imports — toolbar scroll is handled by {@link ScrollArea}. */
export const CONTENT_PAGE_HEADER_TOOLBAR_SCROLL_CLASS = CONTENT_PAGE_HEADER_TOOLBAR_CLASS

/**
 * Shared control height for every toolbar control (buttons, inputs, selects, toggles, segmented shells).
 * Keep all header controls on this size so they align on one baseline.
 */
export const CONTENT_PAGE_HEADER_CONTROL_SIZE_CLASS = 'h-8'

/** Text / outlined action button in the content header toolbar. */
export const CONTENT_PAGE_HEADER_BTN_CLASS =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium leading-none text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50'

/** Primary (filled) action button in the content header toolbar. */
export const CONTENT_PAGE_HEADER_BTN_PRIMARY_CLASS =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md bg-gray-900 px-3 text-xs font-medium leading-none text-white shadow-sm transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50'

/** Icon-only square button in the content header toolbar. */
export const CONTENT_PAGE_HEADER_ICON_BTN_CLASS =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50'

/** Text / search / filter input in the content header toolbar. */
export const CONTENT_PAGE_HEADER_INPUT_CLASS =
  'h-8 min-w-0 shrink-0 rounded-md border border-gray-300 bg-white px-2.5 text-xs leading-none text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-gray-500 focus:ring-1 focus:ring-gray-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'

/** Dropdown / filter trigger (e.g. {@link SearchFilterDropdown}, holiday picker). */
export const CONTENT_PAGE_HEADER_FILTER_BTN_CLASS =
  'inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium leading-none text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900'

/** Segmented control shell (e.g. Movies All / Popular) — matches control height. */
export const CONTENT_PAGE_HEADER_SEGMENTED_SHELL_CLASS = 'flex h-8 shrink-0 items-stretch rounded-md border border-gray-200 bg-gray-50 p-0.5'

/** FormSelect / DropdownSelect trigger typography when used in the content header. */
export const CONTENT_PAGE_HEADER_SELECT_CLASS = '!h-8 !text-xs'

export interface ContentPageHeaderProps {
  /** Header title (string or element). */
  title: ReactNode
  /** Description under the title (required on every content page header). */
  description: ReactNode
  /** Classes applied to the title wrapper. */
  titleClassName?: string
  /** Toolbar controls (filters, buttons). */
  children?: ReactNode
  /** Extra classes on the outer shell. */
  className?: string
}

/**
 * Responsive content page header for module overview/manage views.
 * Keeps title and toolbar on one row; description is required under the title.
 *
 * @param props Header props
 * @returns Header element
 */
export function ContentPageHeader(props: Readonly<ContentPageHeaderProps>) {
  const { title, description, titleClassName = CONTENT_PAGE_TITLE_CLASS, children, className = '' } = props
  const shellClass = [CONTENT_PAGE_HEADER_SHELL_CLASS, className].filter(Boolean).join(' ')

  return (
    <div className={shellClass}>
      <div className={CONTENT_PAGE_HEADER_TITLE_ROW_CLASS}>
        <div className={CONTENT_PAGE_HEADER_TITLE_BLOCK_CLASS}>
          <div className={titleClassName}>{title}</div>
          <p className={CONTENT_PAGE_HEADER_DESCRIPTION_CLASS}>{description}</p>
        </div>
        {children != null ? (
          <ScrollArea
            className={CONTENT_PAGE_HEADER_TOOLBAR_CLASS}
            indicator="horizontal"
            reserveGutter={false}
            alignHorizontalIndicatorWithHostBottom
            scrollClassName="flex h-full w-full items-center"
          >
            <div className={CONTENT_PAGE_HEADER_TOOLBAR_INNER_CLASS}>{children}</div>
          </ScrollArea>
        ) : null}
      </div>
    </div>
  )
}
