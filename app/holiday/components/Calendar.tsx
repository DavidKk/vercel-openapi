'use client'

import { useRequest } from 'ahooks'
import classNames from 'classnames'
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from 'date-fns'
import { useCallback, useState } from 'react'
import { TbCalendarSearch, TbChevronDown, TbChevronLeft, TbChevronRight, TbSearch } from 'react-icons/tb'

import type { Holiday } from '@/app/actions/holiday/api'
import { getHolidaysForYear } from '@/app/holiday/lib/getHolidaysForYear'
import { CONTENT_HEADER_CLASS, FILTER_BUTTON_CLASS } from '@/app/Nav/constants'
import { useDebugPanel } from '@/components/DebugPanel'
import { EmptyState } from '@/components/EmptyState'
import { FloatingDropdown } from '@/components/FloatingDropdown'

interface CalendarProps {
  /** Optional initial data (e.g. from SSR). When omitted, data is loaded client-side via IDB + API. */
  initialHolidays?: Holiday[]
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * Calendar component: month-only, full-height grid, year-month toolbar with arrows and Today,
 * optional holiday dropdown with search; selecting a holiday jumps to that date.
 * Uses IDB cache (24h TTL) then API for each year to reduce requests.
 */
export function Calendar(props: CalendarProps) {
  const { initialHolidays = [] } = props
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: fetchedHolidays, loading } = useRequest(() => getHolidaysForYear(currentYear), {
    refreshDeps: [currentYear],
  })

  const holidays = fetchedHolidays ?? initialHolidays
  const debug = useDebugPanel()
  const forceLoading = debug?.forceLoading ?? false
  const forceError = debug?.forceError ?? null

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

  const todayStr = format(today, 'yyyy-MM-dd')
  const pickerOptions = holidays
    .filter((h) => {
      if (!h.name?.trim()) return false
      if (!searchQuery.trim()) return true
      return h.name.toLowerCase().includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      const aPast = a.date < todayStr
      const bPast = b.date < todayStr
      if (aPast !== bPast) return aPast ? 1 : -1
      return a.date.localeCompare(b.date)
    })

  const selectHoliday = useCallback((h: Holiday) => {
    const d = new Date(h.date)
    setCurrentYear(d.getFullYear())
    setCurrentMonth(d.getMonth())
    setPickerOpen(false)
    setSearchQuery('')
  }, [])

  if (forceError) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center bg-white p-8">
        <p className="text-base text-red-600">{debug?.errorMessage ?? forceError}</p>
      </div>
    )
  }

  if (forceLoading || (loading && holidays.length === 0)) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white" aria-busy="true" aria-label="Loading holiday calendar">
        <div className={`${CONTENT_HEADER_CLASS} min-h-[63px] gap-3`}>
          <div className="flex items-center gap-1">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-100" aria-hidden />
            <div className="h-6 w-28 animate-pulse rounded bg-gray-200" aria-hidden />
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-100" aria-hidden />
          </div>
          <div className="h-9 w-16 animate-pulse rounded-lg bg-gray-100" aria-hidden />
          <div className="ml-auto h-9 w-20 animate-pulse rounded-lg bg-gray-100" aria-hidden />
        </div>
        <div className="grid shrink-0 grid-cols-7 border-b border-gray-100 bg-gray-50/80">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2 text-center text-xs font-medium text-gray-500">
              {label}
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-gray-200 p-px">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center justify-center rounded-sm bg-white">
              <div className="h-5 w-5 animate-pulse rounded bg-gray-100" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (holidays.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <EmptyState icon={<TbCalendarSearch className="h-12 w-12" />} message="No holiday data available for this year." />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className={`${CONTENT_HEADER_CLASS} gap-3`}>
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

        <div className="ml-auto">
          <FloatingDropdown
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            align="end"
            menuMinWidth={320}
            matchTriggerWidth={false}
            menuClassName="rounded-lg border border-gray-200 bg-white py-2 shadow-lg ring-1 ring-black/5"
            trigger={
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
            }
          >
            <div className="border-b border-gray-100 px-2 pb-2" role="presentation">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索节日…"
                className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gray-400"
                aria-label="Search holidays"
              />
            </div>
            <ul className="max-h-56 overflow-auto" role="listbox">
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
          </FloatingDropdown>
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
