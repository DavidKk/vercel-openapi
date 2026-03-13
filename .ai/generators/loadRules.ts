import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse } from 'yaml'

import type { LayoutRules } from './types'

/** Default path to layout rules relative to project root */
export const DEFAULT_RULES_PATH = '.ai/rules/module-layout.yaml'

/**
 * Load layout rules from a YAML file (e.g. .ai/rules/module-layout.yaml).
 *
 * @param rulesPath Path relative to process.cwd() or absolute; defaults to DEFAULT_RULES_PATH
 * @returns LayoutRules for the generator
 */
export function loadRules(rulesPath: string = DEFAULT_RULES_PATH): LayoutRules {
  const absolutePath = resolve(process.cwd(), rulesPath)
  const raw = readFileSync(absolutePath, 'utf-8')
  const parsed = parse(raw) as unknown
  return normalizeRules(parsed)
}

function normalizeRules(parsed: unknown): LayoutRules {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Layout rules must be a non-array object')
  }

  const obj = parsed as Record<string, unknown>
  const items = Array.isArray(obj.sidebarItemsInOrder) ? obj.sidebarItemsInOrder : []

  return {
    sidebarItemsInOrder: items.map((item: unknown) => {
      const i = item as Record<string, unknown>
      return {
        key: String(i.key),
        defaultTitle: String(i.defaultTitle ?? ''),
        pathSuffix: String(i.pathSuffix ?? ''),
        iconName: String(i.iconName ?? 'TbFileText'),
      }
    }),
    outerWrapperClassName: String(obj.outerWrapperClassName ?? ''),
    innerWrapperClassName: String(obj.innerWrapperClassName ?? ''),
    mainContentClassName: String(obj.mainContentClassName ?? ''),
  }
}
