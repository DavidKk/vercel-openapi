import { parse as parseYaml } from 'yaml'

import { moduleSkillMarkdownFilename } from '@/app/api/mcp/skillNaming'
import { DNS_API_SKILL } from '@/app/dns/skill-content'
import { EXCHANGE_RATE_API_SKILL } from '@/app/exchange-rate/skill-content'
import { TASI_API_SKILL } from '@/app/finance/skill-content'
import { FUEL_PRICE_API_SKILL } from '@/app/fuel-price/skill-content'
import { GEO_API_SKILL } from '@/app/geo/skill-content'
import { HOLIDAY_API_SKILL } from '@/app/holiday/skill-content'
import { MOVIES_API_SKILL } from '@/app/movies/skill-content'
import { PRICES_API_SKILL_PUBLIC } from '@/app/prices/skill-content'
import { PROXY_RULE_API_SKILL } from '@/app/proxy-rule/skill-content'
import { WEATHER_API_SKILL } from '@/app/weather/skill-content'

export interface SkillFile {
  /** Target path inside the generated ZIP archive (e.g. "unbnd-exchange-rate-skill.md"). */
  path: string
  /** File content as UTF-8 text (typically markdown). */
  content: string
}

export interface SkillBundle {
  /** Bundle name used in the URL, for example "all" or "exchange-rate". */
  name: string
  /** One-line description used by index/manifest to help select which skill(s) to load. */
  description: string
  /**
   * Optional metadata used by index/manifest only.
   * This must NOT be included in the downloaded SKILL markdown to avoid
   * increasing the LLM context.
   */
  metadata?: Record<string, unknown>
  /** Files included in this bundle. */
  files: SkillFile[]
}

/**
 * If a markdown string starts with YAML front matter, parse it.
 * Front matter format:
 *
 * ---
 * key: value
 * ---
 *
 * @param markdown Filled SKILL markdown content
 * @returns Parsed front matter object, or null when no valid front matter exists
 */
function parseYamlFrontMatter(markdown: string): Record<string, unknown> | null {
  const m = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!m) return null
  try {
    const parsed = parseYaml(m[1])
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

/**
 * Normalize YAML front matter into a minimal metadata shape intended for index/manifest only.
 * We only keep:
 * - `name` (skill/module id)
 * - `description` (one-line)
 *
 * @param yamlMarkdown Filled SKILL markdown content (may include YAML front matter)
 * @param fallbackId Bundle id/name fallback
 * @returns Minimal metadata object or undefined when no YAML front matter exists
 *
 * @param yamlMarkdown Filled skill markdown content (may include YAML front matter)
 * @param fallbackId Bundle id/name
 */
function normalizeFlatMetadata(yamlMarkdown: string, fallbackId: string): Record<string, unknown> | undefined {
  const fm = parseYamlFrontMatter(yamlMarkdown)
  if (!fm) return undefined

  const name = typeof fm.name === 'string' && fm.name.trim() ? fm.name.trim() : fallbackId
  const description = typeof fm.description === 'string' && fm.description.trim() ? fm.description.trim() : ''

  if (!description) return undefined
  return { name, description }
}

/**
 * Strip leading YAML front matter from markdown so exported SKILL content
 * stays instruction-only and avoids extra tokens in LLM context.
 * @param markdown Filled SKILL markdown content
 * @returns Markdown without YAML front matter
 */
function stripYamlFrontMatter(markdown: string): string {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
}

/**
 * Extract a stable one-line description from filled skill markdown.
 * Priority:
 * 1) YAML front matter `description` (if present)
 * 2) First Markdown title line (starts with `# `)
 *
 * @param skillMarkdown Filled SKILL markdown content
 * @returns Cleaned one-line description
 */
function extractSkillDescription(skillMarkdown: string): string {
  const frontMatter = parseYamlFrontMatter(skillMarkdown)
  const fmDescription = frontMatter?.description
  if (typeof fmDescription === 'string' && fmDescription.trim()) return fmDescription.trim()

  const firstTitleLine = skillMarkdown
    .split('\n')
    .map((l) => l.trimEnd())
    .find((l) => l.trimStart().startsWith('# '))
  if (!firstTitleLine) return ''

  const raw = firstTitleLine.replace(/^\s*#\s*/, '').trim()
  // Normalize common trailing markers so description stays short.
  return raw.replace(/\s*\(agent-ready\)\s*$/i, '').trim()
}

/** All available skill bundles that can be turned into ZIP archives. */
export const skillBundles: SkillBundle[] = [
  {
    name: 'exchange-rate',
    description: extractSkillDescription(EXCHANGE_RATE_API_SKILL),
    files: [
      {
        path: moduleSkillMarkdownFilename('exchange-rate'),
        content: stripYamlFrontMatter(EXCHANGE_RATE_API_SKILL),
      },
    ],
    metadata: normalizeFlatMetadata(EXCHANGE_RATE_API_SKILL, 'exchange-rate'),
  },
  {
    name: 'geo',
    description: extractSkillDescription(GEO_API_SKILL),
    files: [
      {
        path: moduleSkillMarkdownFilename('geo'),
        content: stripYamlFrontMatter(GEO_API_SKILL),
      },
    ],
    metadata: normalizeFlatMetadata(GEO_API_SKILL, 'geo'),
  },
  {
    name: 'fuel-price',
    description: extractSkillDescription(FUEL_PRICE_API_SKILL),
    files: [
      {
        path: moduleSkillMarkdownFilename('fuel-price'),
        content: stripYamlFrontMatter(FUEL_PRICE_API_SKILL),
      },
    ],
    metadata: normalizeFlatMetadata(FUEL_PRICE_API_SKILL, 'fuel-price'),
  },
  {
    name: 'holiday',
    description: extractSkillDescription(HOLIDAY_API_SKILL),
    files: [
      {
        path: moduleSkillMarkdownFilename('holiday'),
        content: stripYamlFrontMatter(HOLIDAY_API_SKILL),
      },
    ],
    metadata: normalizeFlatMetadata(HOLIDAY_API_SKILL, 'holiday'),
  },
  {
    name: 'movies',
    description: extractSkillDescription(MOVIES_API_SKILL),
    files: [
      {
        path: moduleSkillMarkdownFilename('movies'),
        content: stripYamlFrontMatter(MOVIES_API_SKILL),
      },
    ],
    metadata: normalizeFlatMetadata(MOVIES_API_SKILL, 'movies'),
  },
  {
    name: 'dns',
    description: extractSkillDescription(DNS_API_SKILL),
    files: [
      {
        path: moduleSkillMarkdownFilename('dns'),
        content: stripYamlFrontMatter(DNS_API_SKILL),
      },
    ],
    metadata: normalizeFlatMetadata(DNS_API_SKILL, 'dns'),
  },
  {
    name: 'weather',
    description: extractSkillDescription(WEATHER_API_SKILL),
    files: [
      {
        path: moduleSkillMarkdownFilename('weather'),
        content: stripYamlFrontMatter(WEATHER_API_SKILL),
      },
    ],
    metadata: normalizeFlatMetadata(WEATHER_API_SKILL, 'weather'),
  },
  {
    name: 'finance',
    description: extractSkillDescription(TASI_API_SKILL),
    files: [
      {
        path: moduleSkillMarkdownFilename('finance'),
        content: stripYamlFrontMatter(TASI_API_SKILL),
      },
    ],
    metadata: normalizeFlatMetadata(TASI_API_SKILL, 'finance'),
  },
  {
    name: 'all',
    description: 'All bundled skills for this product',
    files: [
      { path: moduleSkillMarkdownFilename('exchange-rate'), content: stripYamlFrontMatter(EXCHANGE_RATE_API_SKILL) },
      { path: moduleSkillMarkdownFilename('geo'), content: stripYamlFrontMatter(GEO_API_SKILL) },
      { path: moduleSkillMarkdownFilename('fuel-price'), content: stripYamlFrontMatter(FUEL_PRICE_API_SKILL) },
      { path: moduleSkillMarkdownFilename('holiday'), content: stripYamlFrontMatter(HOLIDAY_API_SKILL) },
      { path: moduleSkillMarkdownFilename('movies'), content: stripYamlFrontMatter(MOVIES_API_SKILL) },
      { path: moduleSkillMarkdownFilename('dns'), content: stripYamlFrontMatter(DNS_API_SKILL) },
      { path: moduleSkillMarkdownFilename('weather'), content: stripYamlFrontMatter(WEATHER_API_SKILL) },
      { path: moduleSkillMarkdownFilename('finance'), content: stripYamlFrontMatter(TASI_API_SKILL) },
      { path: moduleSkillMarkdownFilename('prices'), content: stripYamlFrontMatter(PRICES_API_SKILL_PUBLIC) },
      { path: moduleSkillMarkdownFilename('proxy-rule'), content: stripYamlFrontMatter(PROXY_RULE_API_SKILL) },
    ],
  },
  {
    name: 'prices',
    description: extractSkillDescription(PRICES_API_SKILL_PUBLIC),
    metadata: normalizeFlatMetadata(PRICES_API_SKILL_PUBLIC, 'prices'),
    files: [
      {
        path: moduleSkillMarkdownFilename('prices'),
        content: stripYamlFrontMatter(PRICES_API_SKILL_PUBLIC),
      },
    ],
  },
  {
    name: 'proxy-rule',
    description: extractSkillDescription(PROXY_RULE_API_SKILL),
    metadata: normalizeFlatMetadata(PROXY_RULE_API_SKILL, 'proxy-rule'),
    files: [
      {
        path: moduleSkillMarkdownFilename('proxy-rule'),
        content: stripYamlFrontMatter(PROXY_RULE_API_SKILL),
      },
    ],
  },
]
