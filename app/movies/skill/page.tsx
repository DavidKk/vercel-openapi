import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { MOVIES_API_SKILL } from '../skill-content'

/**
 * Movies Skill page: API usage for agents. Full-height editor-style layout.
 */
export default function MoviesSkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={MOVIES_API_SKILL} downloadFilename="movies-api-skill.md" fill />
    </div>
  )
}
