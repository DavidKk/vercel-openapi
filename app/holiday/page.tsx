import { listHoliday } from '@/app/actions/holiday'

import { Calendar } from './components'

/**
 * Holiday calendar overview page content: used inside /holiday layout.
 * Layout is responsible for header and sidebar; this page only renders calendar content.
 */
export default async function HolidayPage() {
  const currentYear = new Date().getFullYear()
  const holidays = await listHoliday(currentYear)

  return (
    <section className="flex h-full flex-col">
      <Calendar initialHolidays={holidays} />
    </section>
  )
}
