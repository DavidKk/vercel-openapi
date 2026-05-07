'use client'

import classNames from 'classnames'
import { useEffect, useMemo, useRef, useState } from 'react'

import { fuzzyMatch } from '@/utils/fuzzyMatch'

export interface SuggestionOption {
  label: string
  value: string
}

export interface ProductFormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  required?: boolean
  suggestions?: SuggestionOption[]
  value?: string
  validator?: (value: string) => true | string
}

/**
 * Form input with validation and suggestion list.
 * @param props Input props
 * @returns Managed input field
 */
export function ProductFormInput({ label, prefix, required, suggestions = [], className, disabled, value, validator, ...props }: Readonly<ProductFormInputProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function validate(valueToValidate: string) {
    if (!validator) {
      return true
    }
    let valueForValidation = valueToValidate || ''
    if (valueForValidation.includes(' (') && valueForValidation.endsWith(')')) {
      valueForValidation = valueForValidation.split(' (')[0]
    }
    const result = validator(valueForValidation)
    if (result === true) {
      setError(false)
      setErrorMessage('')
      inputRef.current?.setCustomValidity('')
      return true
    }
    const message = typeof result === 'string' ? result : 'Invalid input'
    setError(true)
    setErrorMessage(message)
    inputRef.current?.setCustomValidity(message)
    return false
  }

  const filteredSuggestions = useMemo(() => {
    if (!suggestions.length) {
      return []
    }
    if (!value) {
      return suggestions
    }
    const matched = suggestions
      .map((suggestion) => ({ suggestion, score: fuzzyMatch(suggestion.label, value).score, matched: fuzzyMatch(suggestion.label, value).matched }))
      .filter((item) => item.matched)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.suggestion)
    return matched
  }, [suggestions, value])

  function handleSuggestionSelect(suggestion: SuggestionOption) {
    setIsOpen(false)
    setActiveIndex(-1)
    let valueToSet = suggestion.value
    if (valueToSet.includes(' (') && valueToSet.endsWith(')')) {
      valueToSet = valueToSet.split(' (')[0]
    }
    validate(valueToSet)
    props.onChange?.({ target: { value: valueToSet } } as React.ChangeEvent<HTMLInputElement>)
    inputRef.current?.focus()
  }

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleDocumentMouseDown)
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
  }, [])

  useEffect(() => {
    if (value) {
      validate(value)
    }
  }, [value])

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || filteredSuggestions.length === 0) {
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1))
      return
    }
    if (event.key === 'Enter') {
      if (activeIndex >= 0) {
        event.preventDefault()
        handleSuggestionSelect(filteredSuggestions[activeIndex])
      }
      return
    }
    if (event.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label className="text-xs font-medium text-gray-600">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
      ) : null}
      <div ref={containerRef} className="relative">
        {prefix ? <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">{prefix}</span> : null}
        <input
          {...props}
          ref={inputRef}
          required={required}
          disabled={disabled}
          value={value}
          onFocus={(event) => {
            setIsFocused(true)
            if (suggestions.length) {
              setIsOpen(true)
            }
            props.onFocus?.(event)
          }}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            validate(event.target.value)
            props.onChange?.(event)
          }}
          className={classNames(
            'h-9 w-full rounded-lg border bg-white px-2 text-sm text-gray-900 outline-none transition-colors focus:outline-none',
            {
              'pl-7': prefix,
              'border-red-300 focus:border-red-400': error && !disabled,
              'border-gray-300 focus:border-gray-500': !error && !disabled,
              'cursor-not-allowed bg-gray-100 text-gray-500': disabled,
            },
            className
          )}
        />
        {isOpen && filteredSuggestions.length > 0 ? (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-md">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.value}-${index}`}
                type="button"
                className={classNames('block w-full px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50', {
                  'bg-gray-100': activeIndex === index,
                })}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        ) : null}
        {isFocused && error && errorMessage ? (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-md border border-red-200 bg-red-50 p-1.5 text-xs text-red-600">{errorMessage}</div>
        ) : null}
      </div>
    </div>
  )
}
