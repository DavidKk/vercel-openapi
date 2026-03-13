import type { Tool } from '@/initializer/mcp/tool'

import { convert_currency } from './exchange-rate/convert_currency'
import { get_exchange_rate } from './exchange-rate/get_exchange_rate'
import { calc_fuel_recharge_promo } from './fuel-price/calc_fuel_recharge_promo'
import { get_fuel_price } from './fuel-price/get_fuel_price'
import { get_fuel_price_by_province } from './fuel-price/get_fuel_price_by_province'
import { get_today_holiday } from './holiday/get_today_holiday'
import { is_holiday } from './holiday/is_holiday'
import { is_workday } from './holiday/is_workday'
import { list_holiday } from './holiday/list_holiday'
import { list_latest_movies } from './movies/list_latest_movies'

const ALL_TOOLS: Tool[] = [
  get_exchange_rate,
  convert_currency,
  get_fuel_price,
  get_fuel_price_by_province,
  calc_fuel_recharge_promo,
  get_today_holiday,
  list_holiday,
  is_workday,
  is_holiday,
  list_latest_movies,
]

const TOOLS_MAP = new Map<string, Tool>(ALL_TOOLS.map((t) => [t.name, t]))

/** Category names for /api/function-calling/[category]/tools (use only tools for one domain) */
export const FUNCTION_CALLING_CATEGORIES = ['holiday', 'fuel-price', 'exchange-rate', 'movies'] as const

export type FunctionCallingCategory = (typeof FUNCTION_CALLING_CATEGORIES)[number]

/** Tool names per category so callers can request a subset of tools */
const CATEGORY_TOOL_NAMES: Record<FunctionCallingCategory, string[]> = {
  holiday: ['get_today_holiday', 'list_holiday', 'is_workday', 'is_holiday'],
  'fuel-price': ['get_fuel_price', 'get_fuel_price_by_province', 'calc_fuel_recharge_promo'],
  'exchange-rate': ['get_exchange_rate', 'convert_currency'],
  movies: ['list_latest_movies'],
}

/**
 * Get all registered MCP tools for use with createMCPHttpServer
 * @returns Map of tool name to Tool instance
 */
export function getMCPTools(): Map<string, Tool> {
  return TOOLS_MAP
}

/**
 * Get MCP tools for a single category (for /api/function-calling/[category]/tools).
 * @param category One of holiday, fuel-price, exchange-rate
 * @returns Map of tool name to Tool, or null if category is unknown
 */
export function getMCPToolsByCategory(category: string): Map<string, Tool> | null {
  const names = CATEGORY_TOOL_NAMES[category as FunctionCallingCategory]
  if (!names) {
    return null
  }
  const out = new Map<string, Tool>()
  for (const name of names) {
    const tool = TOOLS_MAP.get(name)
    if (tool) {
      out.set(name, tool)
    }
  }
  return out
}
