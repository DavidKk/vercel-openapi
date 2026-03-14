export interface WeatherLocation {
  latitude: number
  longitude: number
  country?: string
  province?: string
  city?: string
  district?: string
  /** Town or subdistrict (镇/街道) when available */
  town?: string
  name?: string
}

export interface WeatherNow {
  observedAt: string
  condition: string
  conditionText: string
  temperature: number
  feelsLike?: number
  humidity?: number
  windSpeed?: number
  windDirection?: string
  precipitation?: number
  precipitationProbability?: number
}

export interface ForecastHour {
  time: string
  temperature: number
  condition: string
  conditionText: string
  precipitation?: number
  precipitationProbability?: number
  humidity?: number
}

export interface ForecastDay {
  date: string
  minTemp: number
  maxTemp: number
  dayCondition: string
  dayConditionText: string
  nightCondition?: string
  nightConditionText?: string
  precipitationProbability?: number
}

export interface WeatherNowResponse {
  location: WeatherLocation
  now: WeatherNow
}

export interface WeatherForecastResponse {
  location: WeatherLocation
  forecast: {
    granularity: 'hourly' | 'daily'
    hours?: ForecastHour[]
    days?: ForecastDay[]
    meta?: {
      /** Optional HTTP-like status code from upstream provider (e.g. 403 when feature is not available). */
      providerStatus?: number
      /** Optional human-readable message from upstream provider or our adapter. */
      providerMessage?: string
    }
  }
}
