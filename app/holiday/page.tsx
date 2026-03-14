import { Calendar } from './components'

/**
 * Holiday calendar overview. Data is loaded client-side (IDB cache then API per year) to reduce API requests.
 */
export default function HolidayPage() {
  return (
    <section className="flex h-full flex-col">
      <Calendar />
    </section>
  )
}
