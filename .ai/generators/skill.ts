import type { GeneratedFile } from './createModule'
import { createModuleFiles } from './createModule'
import { loadRules } from './loadRules'
import { loadSchema } from './loadSchema'
import type { ModuleSchema } from './types'

/**
 * Generate module files from a schema path or schema object.
 * Rules are loaded from .ai/rules/module-layout.yaml.
 * AI can call this with a schema path (e.g. .ai/schemas/holiday.yaml) to get accurate, rule-compliant code and save tokens.
 *
 * @param schemaOrPath Path to schema YAML (e.g. ".ai/schemas/holiday.yaml") or a ModuleSchema object
 * @returns Generated files (layout, page, api/page, mcp/page)
 */
export async function createModuleFromSchema(schemaOrPath: ModuleSchema | string): Promise<GeneratedFile[]> {
  const rules = loadRules()
  const schema = typeof schemaOrPath === 'string' ? loadSchema(schemaOrPath) : schemaOrPath
  return createModuleFiles(schema, rules)
}
