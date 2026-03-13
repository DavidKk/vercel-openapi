/**
 * CLI entry for module generator. Writes generated files under app/<id>/.
 * Run from project root: pnpm run generate:module [.ai/schemas/<name>.yaml]
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { createModuleFromSchema } from './skill'

const schemaPath = process.argv[2] ?? '.ai/schemas/holiday.yaml'
const root = resolve(process.cwd())

async function main() {
  const files = await createModuleFromSchema(schemaPath)
  for (const { filepath, contents } of files) {
    const full = resolve(root, filepath)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, contents, 'utf-8')
    // eslint-disable-next-line no-console
    console.log('Wrote', filepath)
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
