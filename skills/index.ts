import { EXCHANGE_RATE_API_SKILL } from '@/app/exchange-rate/skill-content'
import { FUEL_PRICE_API_SKILL } from '@/app/fuel-price/skill-content'
import { GEO_API_SKILL } from '@/app/geo/skill-content'

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
    name: 'all',
    files: [
      {
        path: 'skills/exchange-rate-api-skill.md',
        content: EXCHANGE_RATE_API_SKILL,
      },
      {
        path: 'skills/geo-api-skill.md',
        content: GEO_API_SKILL,
      },
      {
        path: 'skills/fuel-price-api-skill.md',
        content: FUEL_PRICE_API_SKILL,
      },
    ],
  },
]
