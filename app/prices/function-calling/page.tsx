import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Prices Function Calling page.
 * @returns Function Calling panel
 */
export default function PricesFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Call prices tools through function calling (ADMIN CURD tools are protected and will be visible after login)."
      defaultToolsCategory="prices"
    />
  )
}
