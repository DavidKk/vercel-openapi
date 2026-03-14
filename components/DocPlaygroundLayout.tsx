'use client'

/**
 * Two-column layout: doc (left) and playground (right).
 * On mobile, columns are horizontally scrollable (left/right swipe); on md and up, side-by-side as before.
 * Use for API, MCP, and Function Calling pages.
 *
 * @param doc Content for the left (documentation) column
 * @param playground Content for the right (playground) column
 * @returns Layout wrapper with responsive horizontal scroll on small screens
 */
export function DocPlaygroundLayout({ doc, playground }: { doc: React.ReactNode; playground: React.ReactNode }) {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 flex-col border-r border-gray-200 bg-white w-[85vw] min-w-[280px] md:w-1/2 md:min-w-[320px] md:flex-1">{doc}</section>
      <section className="flex h-full min-h-0 flex-shrink-0 flex-col bg-gray-50 w-[85vw] min-w-[280px] md:w-1/2 md:min-w-[320px] md:flex-1">{playground}</section>
    </div>
  )
}
