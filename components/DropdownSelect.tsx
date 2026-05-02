'use client'

import classNames from 'classnames'
import { type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { TbChevronDown } from 'react-icons/tb'

import { DropdownMenuScrollArea } from '@/components/DropdownMenuScrollArea'
import { FloatingDropdown } from '@/components/FloatingDropdown'

export interface DropdownSelectOption {
  value: string
  label: string
}

export interface DropdownSelectProps {
  value: string
  onChange: (value: string) => void
  options: DropdownSelectOption[]
  /** Optional id for the trigger button (e.g. `htmlFor` on a label) */
  id?: string
  disabled?: boolean
  /** Accessible name for the trigger */
  ariaLabel?: string
  /** Wrapper width constraints */
  wrapperClassName?: string
  /** Trigger button classes (typography, borders) */
  buttonClassName?: string
  /** Menu panel classes (in addition to defaults) */
  menuClassName?: string
  /** Passed to {@link FloatingDropdown} */
  align?: 'start' | 'end'
  menuMinWidth?: number
  matchTriggerWidth?: boolean
}

function getListboxOptionButtons(list: HTMLElement | null): HTMLButtonElement[] {
  if (!list) {
    return []
  }
  return Array.from(list.querySelectorAll('button[role="option"]:not([disabled])')) as HTMLButtonElement[]
}

/**
 * Single-choice dropdown that uses {@link FloatingDropdown} so menus are not clipped by `overflow: hidden` ancestors.
 * @param props Select configuration
 * @returns Trigger button plus portaled option list
 */
export function DropdownSelect(props: DropdownSelectProps) {
  const {
    value,
    onChange,
    options,
    id,
    disabled,
    ariaLabel,
    wrapperClassName = '',
    buttonClassName = '',
    menuClassName = '',
    align = 'end',
    menuMinWidth = 200,
    matchTriggerWidth = true,
  } = props

  const reactId = useId()
  const listboxId = useMemo(() => (id ? `${id}-listbox` : `dropdown-select-listbox-${reactId.replace(/:/g, '')}`), [id, reactId])
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const [open, setOpen] = useState(false)
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value])
  const selectedIndex = useMemo(() => {
    const i = options.findIndex((o) => o.value === value)
    return i >= 0 ? i : 0
  }, [options, value])

  useEffect(() => {
    if (disabled) {
      setOpen(false)
    }
  }, [disabled])

  const focusOptionIndex = useCallback((index: number) => {
    const buttons = getListboxOptionButtons(listRef.current)
    buttons[index]?.focus({ preventScroll: true })
  }, [])

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        return
      }
      if (!open && event.key === 'ArrowDown') {
        event.preventDefault()
        setOpen(true)
        return
      }
      if (open && event.key === 'ArrowDown') {
        event.preventDefault()
        focusOptionIndex(selectedIndex)
      }
    },
    [disabled, open, focusOptionIndex, selectedIndex]
  )

  const handleListboxKeyDown = useCallback(
    (event: KeyboardEvent<HTMLUListElement>) => {
      const target = event.target
      if (!(target instanceof HTMLButtonElement) || target.getAttribute('role') !== 'option') {
        return
      }
      const list = listRef.current
      const buttons = getListboxOptionButtons(list)
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
          triggerRef.current?.focus()
        } else {
          focusOptionIndex(index - 1)
        }
        return
      }
      if (event.key === 'Home') {
        event.preventDefault()
        focusOptionIndex(0)
        return
      }
      if (event.key === 'End') {
        event.preventDefault()
        focusOptionIndex(n - 1)
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
      onKeyDown: handleListboxKeyDown,
      ...(id ? { 'aria-labelledby': id } : {}),
    }),
    [listboxId, id, handleListboxKeyDown]
  )

  return (
    <div className={classNames('min-w-0', wrapperClassName)}>
      <FloatingDropdown
        open={open && !disabled}
        onOpenChange={setOpen}
        align={align}
        menuMinWidth={menuMinWidth}
        matchTriggerWidth={matchTriggerWidth}
        triggerWrapperClassName="flex w-full min-w-0"
        menuClassName={classNames('rounded-lg border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5', menuClassName)}
        trigger={
          <button
            ref={triggerRef}
            id={id}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-expanded={open && !disabled}
            aria-haspopup="listbox"
            aria-controls={open && !disabled ? listboxId : undefined}
            onClick={() => {
              if (!disabled) {
                setOpen((o) => !o)
              }
            }}
            onKeyDown={handleTriggerKeyDown}
            className={classNames(
              'flex h-9 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left text-[12px] font-medium text-gray-800 shadow-sm transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600',
              'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
              buttonClassName
            )}
          >
            <span className="min-w-0 truncate">{selected?.label ?? value}</span>
            <TbChevronDown className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
          </button>
        }
      >
        <DropdownMenuScrollArea ref={listRef} as="ul" scrollClassName="max-h-64 py-0.5" scrollProps={listboxScrollProps}>
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <li key={opt.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={classNames(
                    'flex w-full px-3 py-2 text-left text-[12px] text-gray-800 transition-colors hover:bg-gray-100',
                    isSelected && 'bg-violet-50 font-medium text-violet-900'
                  )}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </DropdownMenuScrollArea>
      </FloatingDropdown>
    </div>
  )
}
