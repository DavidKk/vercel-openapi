import type { Config } from '@jest/types'
import fs from 'fs'
import JSON5 from 'json5'
import path from 'path'
import { pathsToModuleNameMapper } from 'ts-jest'
import type { CompilerOptions } from 'typescript'

const tsconfigFile = path.join(__dirname, './tsconfig.json')
const tsconfigContent = fs.readFileSync(tsconfigFile, 'utf-8')
const { compilerOptions } = JSON5.parse<{ compilerOptions: CompilerOptions }>(tsconfigContent)
const tsconfigPaths = compilerOptions.paths!

export default (): Config.InitialOptions => ({
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(tsconfigPaths, {
      prefix: '<rootDir>',
    }),
    // Support `import x from './file.md?raw'` in unit tests.
    '^(.+\\.md)\\?raw$': '$1',
  },
  /** Allow ts-jest to transform ESM-only packages in node_modules */
  transformIgnorePatterns: ['node_modules/(?!(jose)/)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.md$': '<rootDir>/jest-md-raw-transformer.js',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
})
