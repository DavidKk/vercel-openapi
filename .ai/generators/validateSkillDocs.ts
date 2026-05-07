/**
 * Validate module skill markdown quality gates.
 * Enforces required guidance sections so agents can decide when to call tools safely.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const APP_DIR = resolve(root, 'app')
const REQUIRED_SKILL_HEADINGS = [
  '## When to use',
  '## Hard boundaries (must check before call)',
  '## Pre-check (before tool call)',
  '## Fallback (when not suitable)',
  '## Retry policy',
]

/**
 * Validate all module skill markdown files under app/(module)/skill*.md.
 * @returns Error messages; empty array means success.
 */
export function validateSkillDocs(): string[] {
  const errors: string[] = []

  let moduleDirs: string[] = []
  try {
    moduleDirs = readdirSync(APP_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return ['app/: directory not readable for skill validation']
  }

  const skillFiles: string[] = []
  for (const moduleDir of moduleDirs) {
    const absDir = resolve(APP_DIR, moduleDir)
    try {
      const files = readdirSync(absDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /^skill.*\.md$/i.test(entry.name))
        .map((entry) => `app/${moduleDir}/${entry.name}`)
      skillFiles.push(...files)
    } catch {
      errors.push(`Skill validation: unable to read app/${moduleDir}`)
    }
  }

  if (skillFiles.length === 0) {
    errors.push('Skill validation: no app/*/skill*.md files found')
    return errors
  }

  for (const relPath of skillFiles) {
    const absPath = resolve(root, relPath)
    let content = ''
    try {
      content = readFileSync(absPath, 'utf8')
    } catch {
      errors.push(`Skill validation: cannot read ${relPath}`)
      continue
    }

    for (const heading of REQUIRED_SKILL_HEADINGS) {
      if (!content.includes(heading)) {
        errors.push(`Skill validation: ${relPath} missing required section "${heading}"`)
      }
    }
  }

  return errors
}

function printAndExit(errors: string[]): never {
  if (errors.length > 0) {
    // eslint-disable-next-line no-console
    console.error('validate:skills failed:\n')
    // eslint-disable-next-line no-console
    errors.forEach((e) => console.error('  -', e))
    process.exit(1)
  }
  // eslint-disable-next-line no-console
  console.log('validate:skills passed.')
  process.exit(0)
}

if (require.main === module) {
  printAndExit(validateSkillDocs())
}
