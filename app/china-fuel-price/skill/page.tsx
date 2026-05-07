import { moduleSkillMarkdownFilename } from '@/app/api/mcp/skillNaming'
import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { FUEL_PRICE_API_SKILL } from '../skill-content'

/**
 * China Fuel Price Skill page: API usage for agents. Full-height editor-style layout.
 */
export default function FuelPriceSkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={FUEL_PRICE_API_SKILL} downloadFilename={moduleSkillMarkdownFilename('fuel-price')} fill />
    </div>
  )
}
