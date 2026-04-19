import { DNS_API_SKILL } from '@/app/dns/skill-content'
import { EXCHANGE_RATE_API_SKILL } from '@/app/exchange-rate/skill-content'
import { TASI_API_SKILL } from '@/app/finance/skill-content'
import { FUEL_PRICE_API_SKILL } from '@/app/fuel-price/skill-content'
import { HOLIDAY_API_SKILL } from '@/app/holiday/skill-content'
import { MOVIES_API_SKILL } from '@/app/movies/skill-content'
import { PRICES_API_SKILL_PUBLIC } from '@/app/prices/skill-content'
import { PROXY_RULE_API_SKILL } from '@/app/proxy-rule/skill-content'
import { WEATHER_API_SKILL } from '@/app/weather/skill-content'
import type { McpResourceProvider } from '@/initializer/mcp'
import { TOOL_CATEGORIES } from '@/services/function-calling/categories'

import { moduleSkillMarkdownFilename, moduleSkillResourceUri } from './skillNaming'

/**
 * Public SKILL markdown per MCP module id (matches `getMCPToolsByCategory` / `TOOL_CATEGORIES`).
 * Prices uses public-only doc for MCP (admin stays in UI / protected doc).
 */
const MODULE_SKILL_MARKDOWN: Record<string, string> = {
  dns: DNS_API_SKILL,
  holiday: HOLIDAY_API_SKILL,
  'fuel-price': FUEL_PRICE_API_SKILL,
  'exchange-rate': EXCHANGE_RATE_API_SKILL,
  movies: MOVIES_API_SKILL,
  weather: WEATHER_API_SKILL,
  finance: TASI_API_SKILL,
  prices: PRICES_API_SKILL_PUBLIC,
  'proxy-rule': PROXY_RULE_API_SKILL,
}

function skillResourceEntry(moduleId: string) {
  return {
    uri: moduleSkillResourceUri(moduleId),
    name: moduleSkillMarkdownFilename(moduleId),
    description: `Agent-ready SKILL for the ${moduleId} HTTP API (same source as the ${moduleId} Skill tab; Prices uses public API only).`,
    mimeType: 'text/markdown' as const,
  }
}

/** Stable order: same as TOOL_CATEGORIES; only slugs that have SKILL markdown. */
function orderedModulesWithSkill(moduleIds: readonly string[] | null): string[] {
  if (moduleIds === null) {
    return TOOL_CATEGORIES.filter((id) => Boolean(MODULE_SKILL_MARKDOWN[id]))
  }
  const wanted = new Set(moduleIds)
  return TOOL_CATEGORIES.filter((id) => wanted.has(id) && MODULE_SKILL_MARKDOWN[id])
}

function createMultiModuleProvider(orderedModuleSlugs: string[]): McpResourceProvider {
  const uriToMarkdown = new Map<string, string>()
  for (const id of orderedModuleSlugs) {
    const md = MODULE_SKILL_MARKDOWN[id]
    if (md) uriToMarkdown.set(moduleSkillResourceUri(id), md)
  }
  return {
    listResources() {
      return orderedModuleSlugs.map((moduleId) => skillResourceEntry(moduleId))
    },
    async readResource(requestedUri: string) {
      const markdown = uriToMarkdown.get(requestedUri.trim())
      if (markdown === undefined) return null
      return { mimeType: 'text/markdown', text: markdown }
    },
  }
}

function createProvider(moduleId: string): McpResourceProvider {
  return createMultiModuleProvider([moduleId])
}

/**
 * MCP Resources for a single module route when SKILL markdown exists.
 */
export function getSkillResourceProviderForModule(moduleSlug: string): McpResourceProvider | undefined {
  if (!MODULE_SKILL_MARKDOWN[moduleSlug]) return undefined
  return createProvider(moduleSlug)
}

/** All module SKILL markdowns for the aggregate MCP (`/api/mcp`). */
export function getAllModulesSkillResourceProvider(): McpResourceProvider {
  return createMultiModuleProvider(orderedModulesWithSkill(null))
}

/** SKILL resources for only the given module slugs (e.g. `?includes=` query), in TOOL_CATEGORIES order. */
export function getSkillResourceProviderForModuleIds(moduleIds: string[]): McpResourceProvider | undefined {
  const ordered = orderedModulesWithSkill(moduleIds)
  if (ordered.length === 0) return undefined
  return createMultiModuleProvider(ordered)
}
