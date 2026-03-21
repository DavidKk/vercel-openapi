/**
 * Validate `.ai/specs/modules-registry.yaml`: structure, paths, sort order,
 * and drift vs `app/<id>/layout.tsx` and `.ai/schemas/*.yaml`.
 * Used by `pnpm run validate:ai`. Run standalone: `pnpm run validate:modules-registry`.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parse } from 'yaml'

const root = resolve(process.cwd())

/** One row in modules-registry.yaml */
interface RegistryModuleRow {
  id: string
  title: string
  spec: string | null
  schema: string
  notes?: string
}

/** Parsed registry document */
interface ModulesRegistryDoc {
  version: number
  modules: RegistryModuleRow[]
}

/**
 * Validate the modules registry file and cross-check repo layout.
 * @returns Error messages; empty array means success.
 */
export function validateModulesRegistry(): string[] {
  const errors: string[] = []
  const registryPath = resolve(root, '.ai/specs/modules-registry.yaml')

  if (!existsSync(registryPath)) {
    return ['.ai/specs/modules-registry.yaml is missing']
  }

  let doc: unknown
  try {
    doc = parse(readFileSync(registryPath, 'utf8'))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return [`modules-registry.yaml: parse error — ${msg}`]
  }

  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return ['modules-registry.yaml: root must be a mapping']
  }

  const { version, modules } = doc as Partial<ModulesRegistryDoc>

  if (typeof version !== 'number') {
    errors.push('modules-registry.yaml: `version` must be a number')
  }

  if (!Array.isArray(modules)) {
    errors.push('modules-registry.yaml: `modules` must be an array')
    return errors
  }

  const seenIds = new Set<string>()

  for (let i = 0; i < modules.length; i++) {
    const row = modules[i]
    const prefix = `modules-registry.yaml modules[${i}]`

    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(`${prefix}: must be a mapping`)
      continue
    }

    const { id, title, spec, schema, notes } = row as RegistryModuleRow

    if (typeof id !== 'string' || id.trim() === '') {
      errors.push(`${prefix}: \`id\` must be a non-empty string`)
    } else {
      if (seenIds.has(id)) {
        errors.push(`${prefix}: duplicate id "${id}"`)
      }
      seenIds.add(id)
    }

    if (typeof title !== 'string' || title.trim() === '') {
      errors.push(`${prefix}: \`title\` must be a non-empty string`)
    }

    if (spec !== null && typeof spec !== 'string') {
      errors.push(`${prefix}: \`spec\` must be a string path or null`)
    } else if (typeof spec === 'string' && spec.trim() !== '') {
      const specAbs = resolve(root, '.ai/specs', spec)
      if (!existsSync(specAbs)) {
        errors.push(`${prefix}: spec file missing: .ai/specs/${spec}`)
      }
    }

    if (typeof schema !== 'string' || schema.trim() === '') {
      errors.push(`${prefix}: \`schema\` must be a non-empty string path`)
    } else {
      const schemaAbs = resolve(root, '.ai', schema)
      if (!existsSync(schemaAbs)) {
        errors.push(`${prefix}: schema file missing: .ai/${schema}`)
      }
    }

    if (notes !== undefined && typeof notes !== 'string') {
      errors.push(`${prefix}: \`notes\` must be a string when present`)
    }
  }

  /** Sort order: ids must be ascending (localeCompare) */
  for (let i = 1; i < modules.length; i++) {
    const prev = modules[i - 1] as RegistryModuleRow
    const cur = modules[i] as RegistryModuleRow
    if (typeof prev?.id === 'string' && typeof cur?.id === 'string' && prev.id.localeCompare(cur.id) >= 0) {
      errors.push(`modules-registry.yaml: modules must be sorted by id ascending; "${cur.id}" should come after "${prev.id}" (check order)`)
    }
  }

  /** Each registry id must have app/<id>/layout.tsx */
  for (const row of modules as RegistryModuleRow[]) {
    if (typeof row.id !== 'string') {
      continue
    }
    const layoutPath = resolve(root, 'app', row.id, 'layout.tsx')
    if (!existsSync(layoutPath)) {
      errors.push(`Module "${row.id}": expected app/${row.id}/layout.tsx (add module UI or remove registry entry)`)
    }
  }

  /** Every .ai/schemas/*.yaml basename must appear as a registry id */
  const schemasDir = resolve(root, '.ai/schemas')
  let schemaFiles: string[] = []
  try {
    schemaFiles = readdirSync(schemasDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
  } catch {
    errors.push('.ai/schemas: directory not readable')
  }

  for (const file of schemaFiles) {
    const base = file.replace(/\.ya?ml$/i, '')
    if (!seenIds.has(base)) {
      errors.push(`Orphan schema: .ai/schemas/${file} has no modules-registry entry (add id "${base}" or remove the schema file)`)
    }
  }

  /** Every app/<id>/layout.tsx must be listed in the registry */
  let appEntries: string[] = []
  try {
    appEntries = readdirSync(resolve(root, 'app'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  } catch {
    errors.push('app/: directory not readable')
  }

  for (const name of appEntries) {
    if (!existsSync(resolve(root, 'app', name, 'layout.tsx'))) {
      continue
    }
    if (!seenIds.has(name)) {
      errors.push(`Orphan app module: app/${name}/layout.tsx exists but id "${name}" is not in modules-registry.yaml (add entry or remove the folder)`)
    }
  }

  return errors
}

function printAndExit(errors: string[]): never {
  if (errors.length > 0) {
    // eslint-disable-next-line no-console
    console.error('validate:modules-registry failed:\n')
    // eslint-disable-next-line no-console
    errors.forEach((e) => console.error('  -', e))
    process.exit(1)
  }
  // eslint-disable-next-line no-console
  console.log('validate:modules-registry passed.')
  process.exit(0)
}

if (require.main === module) {
  printAndExit(validateModulesRegistry())
}
