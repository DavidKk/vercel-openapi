import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { WeatherApiPlayground } from '@/app/weather/api/components'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

/**
 * Weather REST API page.
 * Left side shows documentation for REST endpoints, right side is an interactive playground.
 */
export default function WeatherApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      {/* Left: documentation */}
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Weather REST API" subtitle="Get current weather and short-term forecast for a specific point." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/weather" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Body <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ latitude, longitude }'}</code>. Returns latest &quot;now&quot; weather for that point.
            </p>
          </div>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/weather/forecast" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Body <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ latitude, longitude, granularity, hours, days }'}</code>. Returns short-term forecast for that
              point.
            </p>
          </div>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>Response example</h2>
          <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{
  "location": {
    "latitude": 23.13,
    "longitude": 113.27,
    "country": "中国",
    "province": "广东省",
    "city": "佛山市",
    "district": "南海区",
    "name": "佛山·南海区"
  },
  "now": {
    "observedAt": "2025-01-15T08:00:00Z",
    "condition": "rain",
    "conditionText": "小雨",
    "temperature": 18,
    "feelsLike": 17,
    "humidity": 92,
    "windSpeed": 3.2,
    "windDirection": "NE",
    "precipitation": 1.5,
    "precipitationProbability": 0.9
  }
}`}
          </pre>
        </div>
      </section>

      {/* Right: playground */}
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <WeatherApiPlayground />
        </div>
      </section>
    </div>
  )
}
