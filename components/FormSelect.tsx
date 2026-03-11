'use client'

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
  /** Optional extra class for the select (e.g. min-w-[...]) */
  className?: string
  id?: string
  disabled?: boolean
}

/**
 * Shared native select with consistent height and styling across modules (holiday, fuel-price, geo).
 * Use for filter dropdowns and playground forms so all selects look the same.
 */
export function FormSelect(props: FormSelectProps) {
  const { value, onChange, options, placeholder, className = '', id, disabled } = props

  return (
    <select
      id={id}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
