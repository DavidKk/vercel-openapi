import { PLAYGROUND_HEADER_BADGE_CLASS, PLAYGROUND_HEADER_DESCRIPTION } from '@/app/Nav/constants'
import { CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS, ContentPageHeader } from '@/components/ContentPageHeader'

export interface PlaygroundPanelHeaderProps {
  /** Optional right-side badge (e.g. "GET /api/holiday"). When omitted, badge is shown in Request row instead. */
  badge?: React.ReactNode
  /** Optional subtitle; defaults to PLAYGROUND_HEADER_DESCRIPTION */
  subtitle?: string
}

/**
 * Shared header for Playground panels — same title/description density as overview ContentPageHeader.
 *
 * @param props Header props
 * @returns Header element
 */
export function PlaygroundPanelHeader(props: PlaygroundPanelHeaderProps) {
  const { badge, subtitle = PLAYGROUND_HEADER_DESCRIPTION } = props
  const badgeContent = badge === undefined ? null : typeof badge === 'string' ? <span className={PLAYGROUND_HEADER_BADGE_CLASS}>{badge}</span> : badge

  return (
    <ContentPageHeader title="Playground" description={subtitle} className="bg-white">
      {badgeContent !== null ? <div className={CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS}>{badgeContent}</div> : null}
    </ContentPageHeader>
  )
}
