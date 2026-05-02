import type { Tool } from '@/initializer/mcp/tool'
import { TOOL_CATEGORIES, type ToolCategory } from '@/services/function-calling/categories'

import { dns_query } from './dns/dns_query'
import { convert_currency } from './exchange-rate/convert_currency'
import { get_exchange_rate } from './exchange-rate/get_exchange_rate'
import { get_market_company_daily } from './finance/get_market_company_daily'
import { get_market_daily } from './finance/get_market_daily'
import { get_market_summary_daily } from './finance/get_market_summary_daily'
import { get_market_summary_hourly } from './finance/get_market_summary_hourly'
import { get_stock_summary } from './finance/get_stock_summary'
import { calc_fuel_recharge_promo } from './fuel-price/calc_fuel_recharge_promo'
import { get_fuel_price } from './fuel-price/get_fuel_price'
import { get_fuel_price_by_province } from './fuel-price/get_fuel_price_by_province'
import { get_next_fuel_price_adjustment } from './fuel-price/get_next_fuel_price_adjustment'
import { get_today_holiday } from './holiday/get_today_holiday'
import { is_holiday } from './holiday/is_holiday'
import { is_workday } from './holiday/is_workday'
import { list_holiday } from './holiday/list_holiday'
import { list_latest_movies } from './movies/list_latest_movies'
import { calc_prices } from './prices/calc_prices'
import { create_product } from './prices/create_product'
import { delete_product } from './prices/delete_product'
import { list_price_lists } from './prices/list_price_lists'
import { search_prices } from './prices/search_prices'
import { update_product } from './prices/update_product'
import { get_clash_rule_config } from './proxy-rule/get_clash_rule_config'
import { get_point_forecast } from './weather/get_point_forecast'
import { get_point_weather } from './weather/get_point_weather'

const ALL_TOOLS: Tool[] = [
  dns_query,
  get_exchange_rate,
  convert_currency,
  get_fuel_price,
  get_fuel_price_by_province,
  get_next_fuel_price_adjustment,
  calc_fuel_recharge_promo,
  get_today_holiday,
  list_holiday,
  is_workday,
  is_holiday,
  list_latest_movies,
  get_point_weather,
  get_point_forecast,
  get_market_company_daily,
  get_market_daily,
  get_market_summary_daily,
  get_market_summary_hourly,
  get_stock_summary,
  list_price_lists,
  search_prices,
  calc_prices,
  create_product,
  update_product,
  delete_product,
  get_clash_rule_config,
]

const TOOLS_MAP = new Map<string, Tool>(ALL_TOOLS.map((t) => [t.name, t]))

/** Category names for /api/function-calling/[category]/tools (use only tools for one domain) */
export const FUNCTION_CALLING_CATEGORIES = TOOL_CATEGORIES

export type FunctionCallingCategory = ToolCategory

/** Tool names per category so callers can request a subset of tools */
const CATEGORY_TOOL_NAMES: Record<FunctionCallingCategory, string[]> = {
  dns: ['dns_query'],
  holiday: ['get_today_holiday', 'list_holiday', 'is_workday', 'is_holiday'],
  'fuel-price': ['get_fuel_price', 'get_fuel_price_by_province', 'get_next_fuel_price_adjustment', 'calc_fuel_recharge_promo'],
  'exchange-rate': ['get_exchange_rate', 'convert_currency'],
  movies: ['list_latest_movies'],
  weather: ['get_point_weather', 'get_point_forecast'],
  finance: ['get_market_company_daily', 'get_market_summary_daily', 'get_market_summary_hourly', 'get_market_daily', 'get_stock_summary'],
  prices: ['list_price_lists', 'search_prices', 'calc_prices', 'create_product', 'update_product', 'delete_product'],
  'proxy-rule': ['get_clash_rule_config'],
}

/**
 * Get all registered MCP tools for use with createMCPHttpServer
 * @returns Map of tool name to Tool instance
 */
export function getMCPTools(): Map<string, Tool> {
  return TOOLS_MAP
}

/**
 * Get MCP tools for a single category (for /api/function-calling/[category]/tools and /api/mcp/[module]).
 * @param category One of FUNCTION_CALLING_CATEGORIES
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

/**
 * Get MCP tools for multiple categories (for /api/mcp?includes=holiday,fuel-price).
 * Unknown category names are ignored.
 * @param includes Array of category names (e.g. ['holiday', 'fuel-price'])
 * @returns Map of tool name to Tool (union of all requested categories)
 */
export function getMCPToolsByIncludes(includes: string[]): Map<string, Tool> {
  const out = new Map<string, Tool>()
  for (const category of includes) {
    const map = getMCPToolsByCategory(category)
    if (map) {
      for (const [name, tool] of map) {
        out.set(name, tool)
      }
    }
  }
  return out
}
