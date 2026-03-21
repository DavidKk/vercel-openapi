/**
 * Validate .ai/schemas/*.yaml format, run the module generator for every schema,
 * and verify modules registry drift checks.
 * Run from project root: pnpm run validate:ai
 * Exit 0 if all pass, 1 otherwise (suitable for CI).
 */

import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { loadSchema } from './loadSchema'
import { createModuleFromSchema } from './skill'
import { validateModulesRegistry } from './validateModulesRegistry'

const SCHEMAS_DIR = process.env.SCHEMAS_DIR ?? '.ai/schemas'
const root = resolve(process.cwd())

async function main(): Promise<void> {
  const errors: string[] = []

  /** 1. Validate every schema YAML (parse + normalize) */
  const schemasPath = resolve(root, SCHEMAS_DIR)
  let schemaFiles: string[]
  try {
    schemaFiles = readdirSync(schemasPath)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .sort((a, b) => a.localeCompare(b))
      .map((f) => `${SCHEMAS_DIR}/${f}`)
  } catch (e) {
    errors.push(`Schemas dir not found or not readable: ${SCHEMAS_DIR}`)
    printAndExit(errors)
  }

  if (schemaFiles.length === 0) {
    errors.push(`No .yaml files in ${SCHEMAS_DIR}`)
    printAndExit(errors)
  }

  for (const schemaPath of schemaFiles) {
    try {
      loadSchema(schemaPath)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${schemaPath}: ${msg}`)
    }
  }

  /** 2. Verify generator runs (dry-run: createModuleFromSchema for every schema) */
  for (const schemaPath of schemaFiles) {
    try {
      const files = await createModuleFromSchema(schemaPath)
      if (!Array.isArray(files) || files.length === 0) {
        errors.push(`Generator returned no files for ${schemaPath}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`Generator run failed (${schemaPath}): ${msg}`)
    }
  }

  /** 3. Modules registry + drift vs app/ and schemas */
  errors.push(...validateModulesRegistry())

  printAndExit(errors)
}

function printAndExit(errors: string[]): never {
  if (errors.length > 0) {
    // eslint-disable-next-line no-console
    console.error('validate:ai failed:\n')
    // eslint-disable-next-line no-console
    errors.forEach((e) => console.error('  -', e))
    process.exit(1)
  }
  // eslint-disable-next-line no-console
  console.log('validate:ai passed: schemas OK, generator runnable for all schemas, modules registry OK.')
  process.exit(0)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
