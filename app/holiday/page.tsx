import Link from 'next/link'
import { TbLogout2 } from 'react-icons/tb'

import { listHoliday } from '@/app/actions/holiday'
import { Calendar } from '@/components/Calendar'

/**
 * Holiday calendar page: top header with exit icon (top-left), no sidebar/footer.
 * Content area fills the remaining space with no gaps.
 */
export default async function HolidayPage() {
  const currentYear = new Date().getFullYear()
  const holidays = await listHoliday(currentYear)

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-100">
      {/* Page header: exit icon at top-left */}
      <header className="flex shrink-0 items-center border-b border-gray-200 bg-white px-3 py-2">
        <Link
          href="/"
          className="flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          title="Back to home"
          aria-label="Back to home"
        >
          <TbLogout2 className="h-6 w-6" />
        </Link>
      </header>

      {/* Calendar fills remaining space */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <Calendar initialHolidays={holidays} fetchHolidaysForYear={listHoliday} />
      </main>
    </div>
  )
}
