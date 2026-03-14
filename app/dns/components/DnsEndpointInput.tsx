'use client'

import type { KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { DNS_ENDPOINT_SUGGESTIONS } from '../constants'

const MAX_SUGGESTIONS = 10

export interface DnsEndpointInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  id?: string
  placeholder?: string
}

/**
 * DNS service endpoint input with autocomplete from common DoH providers.
 * @param props.value Controlled value
 * @param props.onChange Called when value changes or an option is selected
 */
export function DnsEndpointInput({ value, onChange, className = '', id, placeholder }: DnsEndpointInputProps) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    const v = value.trim().toLowerCase()
    if (!v) return DNS_ENDPOINT_SUGGESTIONS.slice(0, MAX_SUGGESTIONS)
    return DNS_ENDPOINT_SUGGESTIONS.filter((o) => o.label.toLowerCase().includes(v) || o.value.toLowerCase().includes(v)).slice(0, MAX_SUGGESTIONS)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(option: (typeof DNS_ENDPOINT_SUGGESTIONS)[0]) {
    onChange(option.value)
    setOpen(false)
    setHighlightedIndex(-1)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) {
      if (e.key === 'ArrowDown') setOpen(true)
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((i) => (i < filtered.length - 1 ? i + 1 : i))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((i) => (i > 0 ? i - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          select(filtered[highlightedIndex])
        }
        break
      case 'Escape':
        setOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current?.children[highlightedIndex]) {
      ;(listRef.current.children[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlightedIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && filtered.length > 0}
        aria-controls="dns-endpoint-listbox"
        aria-activedescendant={highlightedIndex >= 0 && filtered[highlightedIndex] ? `dns-opt-${highlightedIndex}` : undefined}
        className={className}
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id="dns-endpoint-listbox"
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {filtered.map((option, index) => (
            <li
              key={option.value}
              id={`dns-opt-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              className={`cursor-pointer px-4 py-2 text-sm ${highlightedIndex === index ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault()
                select(option)
              }}
            >
              <span className="font-medium">{option.label}</span>
              <span className="ml-2 text-gray-400">{option.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
