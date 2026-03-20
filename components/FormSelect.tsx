'use client'

import { TbChevronDown } from 'react-icons/tb'

export interface FormSelectOption {
  value: string
  label: string
}

interface FormSelectProps {
  value: string
  onChange: (value: string) => void
  options: FormSelectOption[]
  /** Optional placeholder when value is empty */
  placeholder?: string
  /** Optional extra class for the native select (typography, borders) */
  className?: string
  /**
   * Optional class for the outer wrapper. Put width constraints here (e.g. max-w-[168px]) so the
   * chevron stays inside the visible field; the icon is positioned relative to this wrapper.
   */
  wrapperClassName?: string
  id?: string
  disabled?: boolean
}

/**
 * Shared select with consistent height and styling across modules.
 * Uses a custom chevron icon instead of the browser default arrow to avoid arrow misalignment.
 */
export function FormSelect(props: FormSelectProps) {
  const { value, onChange, options, placeholder, className = '', wrapperClassName = '', id, disabled } = props

  return (
    <div className={`relative w-full min-w-0 ${wrapperClassName}`}>
      <select
        id={id}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 w-full min-w-0 appearance-none rounded-md border border-gray-300 bg-white px-2.5 pr-8 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <TbChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
    </div>
  )
}
