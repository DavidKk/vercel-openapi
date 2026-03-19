import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Prices Function Calling page.
 * @returns Function Calling panel
 */
export default function PricesFunctionCallingPage() {
  return (
    <FunctionCallingPanel title="Function Calling" subtitle="Call public prices tools for list/search/calc workflows through function calling." defaultToolsCategory="prices" />
  )
}
