export type FormulaDefinition = [string, string]
export type FormulaDefinitions = FormulaDefinition[]

/**
 * Shared common conversion formulas for unit conversions.
 */
export const COMMON_FORMULAS: FormulaDefinitions = [
  ['kg', '= 1,000 g'],
  ['kg', '= 2 斤'],
  ['kg', '= 1 公斤'],
  ['kg', '= 20 两'],
  ['g', '= 0.001 kg'],
  ['g', '= 0.002 斤'],
  ['g', '= 0.001 公斤'],
  ['g', '= 0.02 两'],
  ['斤', '= 500 g'],
  ['斤', '= 0.5 kg'],
  ['斤', '= 0.5 公斤'],
  ['斤', '= 10 两'],
  ['公斤', '= 1,000 g'],
  ['公斤', '= 2 斤'],
  ['公斤', '= 1 kg'],
  ['公斤', '= 20 两'],
  ['两', '= 50 g'],
  ['两', '= 0.05 kg'],
  ['两', '= 0.05 公斤'],
  ['两', '= 0.1 斤'],
]
