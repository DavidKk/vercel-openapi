import { TbArrowUp } from 'react-icons/tb'

/**
 * Floating control to scroll the feed column back to the top.
 * @param props Visibility and click handler
 * @returns Floating button or null
 */
export function NewsOverviewBackToTop(props: { visible: boolean; onClick: () => void }) {
  const { visible, onClick } = props

  if (!visible) {
    return null
  }

  return (
    <button
      type="button"
      className="absolute bottom-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      onClick={onClick}
      aria-label="Back to top"
    >
      <TbArrowUp className="h-5 w-5" aria-hidden />
    </button>
  )
}
