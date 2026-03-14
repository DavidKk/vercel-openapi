import { WeatherOverview } from '@/app/weather/components'

/**
 * Weather overview page content: used inside /weather layout.
 * Layout is responsible for header and sidebar; this page only renders main content.
 */
export default function WeatherPage() {
  return (
    <section className="flex h-full flex-col">
      <WeatherOverview />
    </section>
  )
}
