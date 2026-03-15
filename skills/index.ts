import { DNS_API_SKILL } from '@/app/dns/skill-content'
import { EXCHANGE_RATE_API_SKILL } from '@/app/exchange-rate/skill-content'
import { TASI_API_SKILL } from '@/app/finance/skill-content'
import { FUEL_PRICE_API_SKILL } from '@/app/fuel-price/skill-content'
import { GEO_API_SKILL } from '@/app/geo/skill-content'
import { HOLIDAY_API_SKILL } from '@/app/holiday/skill-content'
import { MOVIES_API_SKILL } from '@/app/movies/skill-content'
import { WEATHER_API_SKILL } from '@/app/weather/skill-content'

export interface SkillFile {
  /** Target path inside the generated ZIP archive (e.g. "skills/exchange-rate-api-skill.md"). */
  path: string
  /** File content as UTF-8 text (typically markdown). */
  content: string
}

export interface SkillBundle {
  /** Bundle name used in the URL, for example "all" or "exchange-rate". */
  name: string
  /** Files included in this bundle. */
  files: SkillFile[]
}

/** All available skill bundles that can be turned into ZIP archives. */
export const skillBundles: SkillBundle[] = [
  {
    name: 'exchange-rate',
    files: [
      {
        path: 'skills/exchange-rate-api-skill.md',
        content: EXCHANGE_RATE_API_SKILL,
      },
    ],
  },
  {
    name: 'geo',
    files: [
      {
        path: 'skills/geo-api-skill.md',
        content: GEO_API_SKILL,
      },
    ],
  },
  {
    name: 'fuel-price',
    files: [
      {
        path: 'skills/fuel-price-api-skill.md',
        content: FUEL_PRICE_API_SKILL,
      },
    ],
  },
  {
    name: 'holiday',
    files: [
      {
        path: 'skills/holiday-api-skill.md',
        content: HOLIDAY_API_SKILL,
      },
    ],
  },
  {
    name: 'movies',
    files: [
      {
        path: 'skills/movies-api-skill.md',
        content: MOVIES_API_SKILL,
      },
    ],
  },
  {
    name: 'dns',
    files: [
      {
        path: 'skills/dns-api-skill.md',
        content: DNS_API_SKILL,
      },
    ],
  },
  {
    name: 'weather',
    files: [
      {
        path: 'skills/weather-api-skill.md',
        content: WEATHER_API_SKILL,
      },
    ],
  },
  {
    name: 'finance',
    files: [
      {
        path: 'skills/finance-api-skill.md',
        content: TASI_API_SKILL,
      },
    ],
  },
  {
    name: 'all',
    files: [
      { path: 'skills/exchange-rate-api-skill.md', content: EXCHANGE_RATE_API_SKILL },
      { path: 'skills/geo-api-skill.md', content: GEO_API_SKILL },
      { path: 'skills/fuel-price-api-skill.md', content: FUEL_PRICE_API_SKILL },
      { path: 'skills/holiday-api-skill.md', content: HOLIDAY_API_SKILL },
      { path: 'skills/movies-api-skill.md', content: MOVIES_API_SKILL },
      { path: 'skills/dns-api-skill.md', content: DNS_API_SKILL },
      { path: 'skills/weather-api-skill.md', content: WEATHER_API_SKILL },
      { path: 'skills/finance-api-skill.md', content: TASI_API_SKILL },
    ],
  },
]
