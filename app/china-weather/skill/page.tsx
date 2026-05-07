import { moduleSkillMarkdownFilename } from '@/app/api/mcp/skillNaming'
import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { WEATHER_API_SKILL } from '../skill-content'

/**
 * Weather Skill page: API usage for agents. Full-height editor-style layout.
 * @returns Weather API skill page content
 */
export default function WeatherSkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={WEATHER_API_SKILL} downloadFilename={moduleSkillMarkdownFilename('weather')} fill />
    </div>
  )
}
