import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse } from 'yaml'

import type { ModuleSchema } from './types'

/**
 * Load and parse a module schema from a YAML file (e.g. .ai/schemas/holiday.yaml).
 *
 * @param schemaPath Path relative to process.cwd() or absolute
 * @returns Normalized ModuleSchema
 */
export function loadSchema(schemaPath: string): ModuleSchema {
  const absolutePath = resolve(process.cwd(), schemaPath)
  const raw = readFileSync(absolutePath, 'utf-8')
  const parsed = parse(raw) as unknown
  return normalizeSchema(parsed)
}

/**
 * Parse a module schema from a YAML string (e.g. from AI or config).
 */
export function parseSchema(yamlString: string): ModuleSchema {
  const parsed = parse(yamlString) as unknown
  return normalizeSchema(parsed)
}

function normalizeSchema(parsed: unknown): ModuleSchema {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Module schema must be a non-array object')
  }

  const obj = parsed as Record<string, unknown>

  const apiPage = obj.apiPage as Record<string, unknown> | undefined
  if (!apiPage || typeof apiPage.title !== 'string' || typeof apiPage.subtitle !== 'string') {
    throw new Error('schema.apiPage must have title and subtitle (strings)')
  }
  const endpoints = Array.isArray(apiPage.endpoints) ? apiPage.endpoints : []
  const normalizedEndpoints = endpoints.map((e: unknown) => {
    const ep = e as Record<string, unknown>
    const example = ep.exampleResponse
    const exampleResponse = typeof example === 'string' ? example.trim() : undefined
    return {
      method: ep.method,
      path: ep.path,
      description: ep.description,
      ...(exampleResponse !== undefined && { exampleResponse }),
    }
  })

  const mcpPage = obj.mcpPage as Record<string, unknown> | undefined
  if (!mcpPage || typeof mcpPage.title !== 'string' || typeof mcpPage.subtitle !== 'string') {
    throw new Error('schema.mcpPage must have title and subtitle (strings)')
  }
  const tools = Array.isArray(mcpPage.tools) ? mcpPage.tools : []
  const normalizedTools = tools.map((t: unknown) => {
    const tool = t as Record<string, unknown>
    return {
      name: tool.name,
      description: tool.description,
      ...(typeof tool.paramsDescription === 'string' && { paramsDescription: tool.paramsDescription }),
    }
  })

  const sidebarItems = Array.isArray(obj.sidebarItems) ? obj.sidebarItems : undefined

  return {
    id: String(obj.id ?? ''),
    name: String(obj.name ?? ''),
    routePrefix: String(obj.routePrefix ?? ''),
    ...(sidebarItems && { sidebarItems: sidebarItems as ModuleSchema['sidebarItems'] }),
    apiPage: {
      title: String(apiPage.title),
      subtitle: String(apiPage.subtitle),
      endpoints: normalizedEndpoints as ModuleSchema['apiPage']['endpoints'],
      playgroundComponentName: String(apiPage.playgroundComponentName ?? ''),
      playgroundImportPath: String(apiPage.playgroundImportPath ?? ''),
    },
    mcpPage: {
      title: String(mcpPage.title),
      subtitle: String(mcpPage.subtitle),
      tools: normalizedTools as ModuleSchema['mcpPage']['tools'],
      playgroundComponentName: String(mcpPage.playgroundComponentName ?? ''),
      playgroundImportPath: String(mcpPage.playgroundImportPath ?? ''),
    },
  }
}
