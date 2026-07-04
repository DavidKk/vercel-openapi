'use client'

import { DropdownSelect, type DropdownSelectOption } from '@/components/DropdownSelect'

export type FormSelectOption = DropdownSelectOption

interface FormSelectProps {
  value: string
  onChange: (value: string) => void
  options: FormSelectOption[]
  /** Optional placeholder when value is empty */
  placeholder?: string
  /** Optional extra class for the trigger button (typography, borders) */
  className?: string
  /**
   * Optional class for the outer wrapper. Put width constraints here (e.g. max-w-[168px]) so the
   * chevron stays inside the visible field.
   */
  wrapperClassName?: string
  id?: string
  disabled?: boolean
}

/**
 * Shared form select with consistent height and styling across modules.
 * Fully custom dropdown (no native `<select>`) via {@link DropdownSelect}.
 * @param props Form select configuration
 * @returns Portaled single-choice dropdown trigger
 */
export function FormSelect(props: FormSelectProps) {
  const { value, onChange, options, placeholder, className = '', wrapperClassName = '', id, disabled } = props

  return (
    <DropdownSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      wrapperClassName={wrapperClassName}
      buttonClassName={className}
    />
  )
}
