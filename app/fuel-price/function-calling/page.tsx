import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Fuel price Function Calling page.
 * Documents GET /api/function-calling/tools and POST /api/function-calling/chat; playground to fetch tools list.
 */
export default function FuelPriceFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Fuel price tools (get_fuel_price, get_fuel_price_by_province, calc_fuel_recharge_promo) are exposed as OpenAI-compatible functions for LLM chat."
      defaultToolsCategory="fuel-price"
    />
  )
}
