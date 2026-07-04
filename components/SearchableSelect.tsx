'use client'

import classNames from 'classnames'
import { type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { TbChevronDown } from 'react-icons/tb'

import { DropdownMenuScrollArea } from '@/components/DropdownMenuScrollArea'
import { FloatingDropdown } from '@/components/FloatingDropdown'
import { fuzzyMatch } from '@/utils/fuzzyMatch'

export interface Option {
  value: string
  label: string
}

export interface SearchableSelectProps {
  className?: string
  value?: string
  placeholder?: string
  options?: Option[]
  onChange?: (value: string) => void
  clearable?: boolean
  size?: 'sm' | 'md' | 'lg'
  searchable?: boolean
  /** Classes on the trigger button (e.g. borderless inline picker) */
  triggerClassName?: string
  /** `data-testid` on the scrollable options list */
  listTestId?: string
  /** Search input placeholder */
  searchPlaceholder?: string
}

function getListboxOptionButtons(list: HTMLElement | null): HTMLButtonElement[] {
  if (!list) {
    return []
  }
  return Array.from(list.querySelectorAll('button[role="option"]:not([disabled])')) as HTMLButtonElement[]
}

/**
 * Searchable select dropdown for product and option picking.
 * Uses {@link FloatingDropdown} so menus are not clipped by overflow ancestors.
 * @param props Select props
 * @returns Searchable select component
 */
export function SearchableSelect(props: Readonly<SearchableSelectProps>) {
  const {
    className,
    options = [],
    value,
    placeholder,
    onChange,
    clearable = true,
    size = 'md',
    searchable = true,
    triggerClassName,
    listTestId,
    searchPlaceholder = 'Search...',
  } = props

  const reactId = useId()
  const listboxId = useMemo(() => `searchable-select-listbox-${reactId.replace(/:/g, '')}`, [reactId])
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [selectedValue, setSelectedValue] = useState(value ?? '')
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setSelectedValue(value ?? '')
  }, [value])

  useEffect(() => {
    if (!open) {
      setSearchTerm('')
    }
  }, [open])

  useEffect(() => {
    if (open && searchable) {
      searchInputRef.current?.focus()
    }
  }, [open, searchable])

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return options
    }
    return options
      .map((option) => ({ option, matchResult: fuzzyMatch(option.label, searchTerm) }))
      .filter((item) => item.matchResult.matched)
      .sort((a, b) => b.matchResult.score - a.matchResult.score)
      .map((item) => item.option)
  }, [options, searchTerm])

  const selectedLabel = options.find((option) => option.value === selectedValue)?.label ?? ''

  function handleOptionSelect(optionValue: string) {
    setSelectedValue(optionValue)
    onChange?.(optionValue)
    setOpen(false)
    setSearchTerm('')
  }

  const focusOptionIndex = useCallback((index: number) => {
    const buttons = getListboxOptionButtons(listRef.current)
    buttons[index]?.focus({ preventScroll: true })
  }, [])

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

  const handleListboxKeyDown = useCallback(
    (event: KeyboardEvent<HTMLUListElement>) => {
      const target = event.target
      if (!(target instanceof HTMLButtonElement) || target.getAttribute('role') !== 'option') {
        return
      }
      const buttons = getListboxOptionButtons(listRef.current)
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
          if (searchable) {
            searchInputRef.current?.focus()
          } else {
            triggerRef.current?.focus()
          }
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
    [filteredOptions.length, focusOptionIndex, searchable]
  )

  const listboxScrollProps = useMemo(
    () => ({
      id: listboxId,
      role: 'listbox' as const,
      ...(listTestId ? { 'data-testid': listTestId } : {}),
      onKeyDown: handleListboxKeyDown,
    }),
    [listboxId, listTestId, handleListboxKeyDown]
  )

  const defaultTriggerClass = classNames(
    'flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-gray-800',
    {
      'h-10': size === 'sm',
      'h-11': size === 'md',
      'h-12': size === 'lg',
    },
    triggerClassName
  )

  return (
    <div className={classNames('min-w-0', className)}>
      <FloatingDropdown
        open={open}
        onOpenChange={setOpen}
        align="start"
        menuMinWidth={200}
        matchTriggerWidth
        triggerWrapperClassName="flex w-full min-w-0"
        menuClassName="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md ring-1 ring-black/5"
        trigger={
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            onClick={() => setOpen((isOpen) => !isOpen)}
            onKeyDown={handleTriggerKeyDown}
            className={defaultTriggerClass}
          >
            <span className={classNames('truncate', selectedValue ? 'text-gray-800' : 'text-gray-400')}>{selectedValue ? selectedLabel : (placeholder ?? 'Select')}</span>
            <span className="ml-2 flex items-center gap-2">
              {clearable && selectedValue ? (
                <span
                  role="button"
                  tabIndex={-1}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedValue('')
                    onChange?.('')
                    setSearchTerm('')
                  }}
                >
                  ×
                </span>
              ) : null}
              <TbChevronDown className={classNames('h-4 w-4 text-gray-500 transition-transform', { 'rotate-180': open })} />
            </span>
          </button>
        }
      >
        {searchable ? (
          <div className="border-b border-gray-100 p-2">
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-gray-200"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}
        <DropdownMenuScrollArea ref={listRef} as="ul" scrollClassName="max-h-60 py-1" scrollProps={listboxScrollProps}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isSelected = option.value === selectedValue
              return (
                <li key={option.value} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={classNames(
                      'block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100',
                      isSelected && 'bg-gray-100 font-medium text-gray-900'
                    )}
                    onClick={() => handleOptionSelect(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })
          ) : (
            <li role="none">
              <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
            </li>
          )}
        </DropdownMenuScrollArea>
      </FloatingDropdown>
    </div>
  )
}

export default SearchableSelect
