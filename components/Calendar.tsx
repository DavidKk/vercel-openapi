'use client'

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import classNames from 'classnames'
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from 'date-fns'
import { useState } from 'react'

import type { Holiday } from '@/app/actions/holiday/api'

/**
 * Props for the Calendar component
 */
interface CalendarProps {
  /** Array of holiday data to display in the calendar */
  holidays: Holiday[]
}

/**
 * Calendar component that displays a monthly view with holiday information
 * Highlights holidays, workdays, and the current day
 */
export function Calendar(props: CalendarProps) {
  const { holidays } = props
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const currentYear = today.getFullYear()

  const handlePrevMonth = () => {
    if (currentMonth > 0) {
      setCurrentMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth < 11) {
      setCurrentMonth((prev) => prev + 1)
    }
  }

  const monthStart = startOfMonth(new Date(currentYear, currentMonth))
  const monthEnd = endOfMonth(new Date(currentYear, currentMonth))

  // Get days from previous month to fill the first week
  const prevMonthEnd = new Date(currentYear, currentMonth, 0)
  const prevMonthDays = eachDayOfInterval({
    start: new Date(currentYear, currentMonth - 1, prevMonthEnd.getDate() - monthStart.getDay() + 1),
    end: prevMonthEnd,
  })

  // Get days from current month
  const currentMonthDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  })

  // Get days from next month to fill the last week
  const nextMonthStart = new Date(currentYear, currentMonth + 1, 1)
  const nextMonthDays = eachDayOfInterval({
    start: nextMonthStart,
    end: new Date(currentYear, currentMonth + 1, 6 - monthEnd.getDay()),
  })

  const days = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays]

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          disabled={currentMonth === 0}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800">{format(new Date(currentYear, currentMonth), 'MMMM yyyy')}</h2>
        <button
          onClick={handleNextMonth}
          disabled={currentMonth === 11}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-base font-bold text-gray-500 py-4">
            {day}
          </div>
        ))}

        {days.map((day) => {
          const holiday = holidays.find((h) => isSameDay(new Date(h.date), day))
          const isToday = isSameDay(day, today)
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const isHolday = holiday?.isHoliday || holiday?.isRestDay
          const isAjustWorkDay = holiday?.isWorkDay

          const isPrevMonth = day < monthStart
          const isNextMonth = day > monthEnd

          return (
            <div
              key={day.toString()}
              className={classNames(
                'flex h-16 items-center justify-center rounded-md text-base font-semibold',
                isPrevMonth || isNextMonth
                  ? 'text-gray-400'
                  : isToday
                    ? 'bg-blue-100 font-medium text-blue-800'
                    : isAjustWorkDay
                      ? 'bg-green-100 text-green-800'
                      : isHolday
                        ? 'bg-red-200 text-red-800'
                        : isWeekend
                          ? 'bg-red-100 text-red-800'
                          : ''
              )}
            >
              <div className="flex flex-col items-center">
                <span>{format(day, 'd')}</span>
                {isToday ? (
                  <span className={classNames('text-sm')}>今日</span>
                ) : (
                  holiday && <span className={classNames('text-sm')}>{isToday ? '今日' : holiday.isRestDay ? '调休' : holiday.name}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
