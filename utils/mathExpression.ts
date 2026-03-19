/**
 * Evaluate a simple math expression with + - * / operators.
 * @param expression Math expression string
 * @returns Result number or NaN for invalid expression
 */
export function calculateMathExpression(expression: string): number {
  const cleanExpression = expression.replace(/\s+/g, '')
  if (!/^-?[\d.+*/-]+$/.test(cleanExpression)) {
    return NaN
  }

  if (/[+*/]{2,}|[+*/]-[+*/]|[+*/]-$/.test(cleanExpression)) {
    return NaN
  }

  if (/[+*/]$/.test(cleanExpression)) {
    return NaN
  }

  try {
    return evaluateExpression(cleanExpression)
  } catch {
    return NaN
  }
}

function evaluateExpression(expression: string): number {
  let result = expression

  while (result.includes('*') || result.includes('/')) {
    result = result.replace(/(-?\d+\.?\d*)([*/])(-?\d+\.?\d*)/, (_, a, operator, b) => {
      const numA = Number(a)
      const numB = Number(b)
      if (!Number.isFinite(numA) || !Number.isFinite(numB)) {
        return `${a}${operator}${b}`
      }

      if (operator === '*') {
        return String(numA * numB)
      }

      if (numB === 0) {
        throw new Error('Division by zero')
      }
      return String(numA / numB)
    })
  }

  while (result.includes('+') || (result.includes('-') && !/^-/.test(result))) {
    result = result.replace(/(-?\d+\.?\d*)([+-])(-?\d+\.?\d*)/, (_, a, operator, b) => {
      const numA = Number(a)
      const numB = Number(b)
      if (!Number.isFinite(numA) || !Number.isFinite(numB)) {
        return `${a}${operator}${b}`
      }
      return String(operator === '+' ? numA + numB : numA - numB)
    })
  }

  const finalResult = Number(result)
  return Number.isFinite(finalResult) ? finalResult : NaN
}
