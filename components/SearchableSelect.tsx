'use client'

import classNames from 'classnames'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TbChevronDown } from 'react-icons/tb'

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
}

/**
 * Searchable select dropdown for product and option picking.
 * @param props Select props
 * @returns Searchable select component
 */
export default function SearchableSelect(props: Readonly<SearchableSelectProps>) {
  const { className, options = [], value, placeholder, onChange, clearable = true, size = 'md', searchable = true } = props
  const [selectedValue, setSelectedValue] = useState(value ?? '')
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const selectRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelectedValue(value ?? '')
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

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
    setIsOpen(false)
    setSearchTerm('')
    setActiveIndex(-1)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setIsOpen(true)
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        event.preventDefault()
        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          handleOptionSelect(filteredOptions[activeIndex].value)
        } else if (filteredOptions[0]) {
          handleOptionSelect(filteredOptions[0].value)
        }
        break
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div ref={selectRef} className={classNames('relative w-full', className)} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={classNames('flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-gray-800', {
          'h-10': size === 'sm',
          'h-11': size === 'md',
          'h-12': size === 'lg',
        })}
      >
        <span className={classNames('truncate', selectedValue ? 'text-gray-800' : 'text-gray-400')}>{selectedValue ? selectedLabel : (placeholder ?? 'Select')}</span>
        <span className="ml-2 flex items-center gap-2">
          {clearable && selectedValue ? (
            <span
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
          <TbChevronDown className={classNames('h-4 w-4 text-gray-500 transition-transform', { 'rotate-180': isOpen })} />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
          {searchable ? (
            <div className="p-2">
              <input
                ref={inputRef}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-gray-200"
                placeholder="Search..."
              />
            </div>
          ) : null}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  className={classNames('block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100', { 'bg-gray-100': activeIndex === index })}
                  onClick={() => handleOptionSelect(option.value)}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
