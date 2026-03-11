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
]

const TOOLS_MAP = new Map<string, Tool>(ALL_TOOLS.map((t) => [t.name, t]))

/**
 * Get all registered MCP tools for use with createMCPHttpServer
 * @returns Map of tool name to Tool instance
 */
export function getMCPTools(): Map<string, Tool> {
  return TOOLS_MAP
}
