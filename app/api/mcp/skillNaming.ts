import packageJson from '../../../package.json'

const PKG_NAME = typeof packageJson.name === 'string' ? packageJson.name : 'unbnd'

/** Download / ZIP path / MCP resource `name`, e.g. `unbnd-dns-skill.md`. */
export function moduleSkillMarkdownFilename(moduleId: string): string {
  return `${PKG_NAME}-${moduleId}-skill.md`
}

/** Stable MCP resource URI, e.g. `skill://unbnd-dns/unbnd-dns-skill.md`. */
export function moduleSkillResourceUri(moduleId: string): string {
  return `skill://unbnd-${moduleId}/${moduleSkillMarkdownFilename(moduleId)}`
}

/** MCP `serverInfo.name` / GET manifest `name` for `/api/mcp/<module>`. */
export function mcpServiceNameForModule(moduleId: string): string {
  return `unbnd-${moduleId}`
}
