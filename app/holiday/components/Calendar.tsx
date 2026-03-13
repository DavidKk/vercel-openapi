'use client'

import classNames from 'classnames'
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from 'date-fns'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TbChevronDown, TbChevronLeft, TbChevronRight, TbSearch } from 'react-icons/tb'

import type { Holiday } from '@/app/actions/holiday/api'
import { CONTENT_HEADER_CLASS, FILTER_BUTTON_CLASS } from '@/app/Nav/constants'

/** Server action type: fetch holidays for a given year */
type FetchHolidaysForYear = (year?: number) => Promise<Holiday[]>

interface CalendarProps {
  initialHolidays: Holiday[]
  fetchHolidaysForYear: FetchHolidaysForYear
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * Calendar component: month-only, full-height grid, year-month toolbar with arrows and Today,
 * optional holiday dropdown with search; selecting a holiday jumps to that date.
 */
export function Calendar(props: CalendarProps) {
  const { initialHolidays = [], fetchHolidaysForYear } = props
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [holidays, setHolidays] = useState<Holiday[]>(Array.isArray(initialHolidays) ? initialHolidays : [])
  const [holidayYear, setHolidayYear] = useState(today.getFullYear())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentYear === holidayYear || typeof fetchHolidaysForYear !== 'function') return
    setHolidayYear(currentYear)
    fetchHolidaysForYear(currentYear).then((list) => setHolidays(Array.isArray(list) ? list : []))
  }, [currentYear, holidayYear, fetchHolidaysForYear])

  const monthStart = startOfMonth(new Date(currentYear, currentMonth))
  const monthEnd = endOfMonth(new Date(currentYear, currentMonth))
  const gridStart = new Date(currentYear, currentMonth, 1 - monthStart.getDay())
  const gridEnd = new Date(currentYear, currentMonth, monthEnd.getDate() + (6 - monthEnd.getDay()))
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const handlePrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }, [currentMonth])

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }, [currentMonth])

  const goToToday = useCallback(() => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
  }, [])

  const pickerOptions = holidays.filter((h) => {
    if (!h.name?.trim()) return false
    if (!searchQuery.trim()) return true
    return h.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const selectHoliday = useCallback((h: Holiday) => {
    const d = new Date(h.date)
    setCurrentYear(d.getFullYear())
    setCurrentMonth(d.getMonth())
    setPickerOpen(false)
    setSearchQuery('')
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className={`${CONTENT_HEADER_CLASS} flex-wrap gap-3`}>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePrevMonth} className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100" aria-label="Previous month">
            <TbChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[120px] text-center text-lg font-semibold text-gray-800">
            {currentYear}年{currentMonth + 1}月
          </span>
          <button type="button" onClick={handleNextMonth} className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100" aria-label="Next month">
            <TbChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button type="button" onClick={goToToday} className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100" aria-label="Go to today">
          今天
        </button>

        <div className="relative ml-auto" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className={FILTER_BUTTON_CLASS}
            aria-label="Choose a holiday"
            aria-expanded={pickerOpen}
            aria-haspopup="listbox"
          >
            <TbSearch className="h-4 w-4 text-gray-500" />
            节日
            <TbChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          {pickerOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg" role="listbox">
              <div className="border-b border-gray-100 px-2 pb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索节日…"
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gray-400"
                  aria-label="Search holidays"
                />
              </div>
              <ul className="max-h-56 overflow-auto">
                {pickerOptions.length === 0 ? (
                  <li className="px-3 py-2.5 text-sm text-gray-500">无匹配节日</li>
                ) : (
                  pickerOptions.map((h) => (
                    <li key={h.date}>
                      <button type="button" onClick={() => selectHoliday(h)} className="w-full px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-100" role="option">
                        <span className="font-medium">{h.name}</span>
                        <span className="ml-2 text-gray-500">{h.date}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-7 border-b border-gray-100 bg-gray-50/80">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2 text-center text-xs font-medium text-gray-500">
            {label}
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-gray-200 p-px">
        {days.map((day, index) => {
          const holiday = holidays.find((h) => isSameDay(new Date(h.date), day))
          const isToday = isSameDay(day, today)
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const isHoliday = holiday?.isHoliday || holiday?.isRestDay
          const isWorkDay = holiday?.isWorkDay
          const isPrevMonth = day < monthStart
          const isNextMonth = day > monthEnd

          return (
            <div
              key={`${format(day, 'yyyy-MM-dd')}-${index}`}
              className={classNames(
                'flex flex-col items-center justify-center rounded-sm bg-white text-sm',
                isPrevMonth || isNextMonth
                  ? 'text-gray-400'
                  : isWorkDay
                    ? 'bg-green-50 text-green-800'
                    : isHoliday
                      ? 'bg-red-100 text-red-800'
                      : isWeekend
                        ? 'bg-red-50/70 text-red-700'
                        : 'text-gray-800'
              )}
            >
              <span className="text-base font-bold">{format(day, 'd')}</span>
              {!isPrevMonth &&
                !isNextMonth &&
                (() => {
                  const label = isToday ? '今日' : holiday?.isRestDay ? '调休' : (holiday?.name ?? '')
                  if (!label) return null
                  const badgeClass = isToday
                    ? 'bg-sky-100 text-sky-800'
                    : holiday?.isRestDay
                      ? 'bg-amber-200/90 text-amber-900'
                      : isWorkDay
                        ? 'bg-green-200/90 text-green-900'
                        : 'bg-red-200/90 text-red-800'
                  return (
                    <span className={classNames('mt-1 max-w-full truncate rounded-full px-1.5 py-0.5 text-xs font-medium', badgeClass)} title={label}>
                      {label}
                    </span>
                  )
                })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
