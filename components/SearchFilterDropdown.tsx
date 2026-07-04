'use client'

import classNames from 'classnames'
import { type KeyboardEvent, type ReactNode, useCallback, useId, useMemo, useRef, useState } from 'react'
import { TbChevronDown, TbSearch } from 'react-icons/tb'

import { DropdownMenuScrollArea } from '@/components/DropdownMenuScrollArea'
import { FloatingDropdown } from '@/components/FloatingDropdown'

export interface SearchFilterOption {
  value: string
  label: string
}

export interface SearchFilterDropdownProps {
  /** Currently selected value */
  value: string
  onChange: (value: string) => void
  options: SearchFilterOption[]
  /** Trigger label; usually the field name (e.g. `Genre`, `地区`) */
  triggerLabel: ReactNode
  /** Accessible name for the trigger */
  ariaLabel?: string
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Text shown when no option matches the query */
  emptyText?: string
  /** Trigger button classes (module-specific compact styles) */
  buttonClassName?: string
  /** Menu panel width class (e.g. `w-40`, `w-72`) */
  menuWidthClassName?: string
  align?: 'start' | 'end'
  /** Show the leading search icon inside the trigger */
  showTriggerIcon?: boolean
}

function getOptionButtons(list: HTMLElement | null): HTMLButtonElement[] {
  if (!list) {
    return []
  }
  return Array.from(list.querySelectorAll('button[role="option"]:not([disabled])')) as HTMLButtonElement[]
}

/**
 * Compact toolbar filter: a trigger button opening a searchable single-choice list.
 * Uses {@link FloatingDropdown} so the panel is not clipped by scrollable/overflow-hidden headers.
 * Unlike {@link DropdownSelect}, the trigger shows a fixed field label rather than the selected value.
 * @param props Filter configuration
 * @returns Trigger button plus portaled searchable option list
 */
export function SearchFilterDropdown(props: SearchFilterDropdownProps) {
  const {
    value,
    onChange,
    options,
    triggerLabel,
    ariaLabel,
    searchPlaceholder = 'Search…',
    emptyText = 'No match',
    buttonClassName = '',
    menuWidthClassName = 'w-56',
    align = 'end',
    showTriggerIcon = true,
  } = props

  const reactId = useId()
  const listboxId = useMemo(() => `search-filter-listbox-${reactId.replace(/:/g, '')}`, [reactId])
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return options
    }
    return options.filter((option) => option.label.toLowerCase().includes(query))
  }, [options, searchQuery])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) {
      setSearchQuery('')
    }
  }, [])

  const focusOptionIndex = useCallback((index: number) => {
    const buttons = getOptionButtons(listRef.current)
    buttons[index]?.focus({ preventScroll: true })
  }, [])

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue)
      setOpen(false)
      setSearchQuery('')
      triggerRef.current?.focus()
    },
    [onChange]
  )

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!open && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
        event.preventDefault()
        setOpen(true)
      }
    },
    [open]
  )

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown' && filteredOptions.length > 0) {
        event.preventDefault()
        focusOptionIndex(0)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    },
    [filteredOptions.length, focusOptionIndex]
  )

  const handleListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLUListElement>) => {
      const target = event.target
      if (!(target instanceof HTMLButtonElement) || target.getAttribute('role') !== 'option') {
        return
      }
      const buttons = getOptionButtons(listRef.current)
      const n = buttons.length
      if (n === 0) {
        return
      }
      const index = buttons.indexOf(target)
      if (index < 0) {
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        focusOptionIndex(Math.min(index + 1, n - 1))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (index <= 0) {
          searchInputRef.current?.focus()
        } else {
          focusOptionIndex(index - 1)
        }
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    },
    [focusOptionIndex]
  )

  const listboxScrollProps = useMemo(
    () => ({
      id: listboxId,
      role: 'listbox' as const,
      onKeyDown: handleListKeyDown,
    }),
    [listboxId, handleListKeyDown]
  )

  return (
    <FloatingDropdown
      open={open}
      onOpenChange={handleOpenChange}
      align={align}
      matchTriggerWidth={false}
      triggerWrapperClassName="inline-flex"
      menuClassName={classNames('rounded-lg border border-gray-200 bg-white py-2 shadow-lg ring-1 ring-black/5', menuWidthClassName)}
      trigger={
        <button
          ref={triggerRef}
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          onClick={() => setOpen((isOpen) => !isOpen)}
          onKeyDown={handleTriggerKeyDown}
          className={buttonClassName}
        >
          {showTriggerIcon ? <TbSearch className="h-3 w-3 shrink-0 text-gray-500 sm:h-4 sm:w-4" aria-hidden /> : null}
          {triggerLabel}
          <TbChevronDown className={classNames('h-3 w-3 shrink-0 text-gray-500 transition-transform sm:h-4 sm:w-4', open && 'rotate-180')} aria-hidden />
        </button>
      }
    >
      <div className="border-b border-gray-100 px-2 pb-2">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={searchPlaceholder}
          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-gray-400"
          aria-label={searchPlaceholder}
        />
      </div>
      <DropdownMenuScrollArea ref={listRef} as="ul" scrollClassName="max-h-56" scrollProps={listboxScrollProps}>
        {filteredOptions.length === 0 ? (
          <li role="none">
            <div className="px-3 py-2.5 text-xs text-gray-500">{emptyText}</div>
          </li>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = option.value === value
            return (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={classNames(
                    'block w-full px-3 py-2.5 text-left text-xs text-gray-800 transition-colors hover:bg-gray-100',
                    isSelected && 'bg-gray-100 font-medium text-gray-900'
                  )}
                >
                  {option.label}
                </button>
              </li>
            )
          })
        )}
      </DropdownMenuScrollArea>
    </FloatingDropdown>
  )
}
