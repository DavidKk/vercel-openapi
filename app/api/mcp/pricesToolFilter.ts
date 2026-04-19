import type { Tool } from '@/initializer/mcp/tool'

const PROTECTED_PRICES_TOOL_NAMES = ['create_product', 'update_product', 'delete_product'] as const

/** Hide mutating Prices tools in MCP manifest when the caller is not authenticated (same as `/api/mcp/prices`). */
export function filterProtectedPricesTools(tools: Map<string, Tool>, authenticated: boolean): Map<string, Tool> {
  if (authenticated) return tools
  const next = new Map(tools)
  for (const name of PROTECTED_PRICES_TOOL_NAMES) {
    next.delete(name)
  }
  return next
}
