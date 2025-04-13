import { listHoliday } from '@/app/actions/holiday'
import { Calendar } from '@/components/Calendar'

export default async function CalendarPage() {
  const holidays = await listHoliday()

  return (
    <div className="flex flex-col items-center w-screen min-h-[calc(100vh-60px-64px)] relative bg-gray-50 py-12 px-12">
      <Calendar holidays={holidays} />
    </div>
  )
}
