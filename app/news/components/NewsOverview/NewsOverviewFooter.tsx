/**
 * Status footer: merged pool total and how many rows are loaded in the client list.
 * @param props Skeleton visibility, optional total count, and current loaded length
 * @returns Footer status region
 */
export function NewsOverviewFooter(props: { showMainFeedSkeleton: boolean; totalArticleCount: number | null; loadedItemCount: number }) {
  const { showMainFeedSkeleton, totalArticleCount, loadedItemCount } = props

  return (
    <footer
      className="flex shrink-0 flex-col gap-0.5 border-t border-gray-200 bg-white px-4 py-1.5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-end sm:gap-3"
      role="status"
      aria-live="polite"
    >
      <span className="self-end sm:self-auto">
        {showMainFeedSkeleton && totalArticleCount === null ? (
          <span className="text-gray-400">…</span>
        ) : totalArticleCount !== null ? (
          <>
            <span className="font-semibold tabular-nums text-gray-800">{totalArticleCount}</span> in this channel
            {loadedItemCount > 0 && loadedItemCount < totalArticleCount ? (
              <>
                {' '}
                · <span className="tabular-nums">{loadedItemCount}</span> loaded
              </>
            ) : null}
          </>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </span>
    </footer>
  )
}
