import {
  PANEL_HEADER_ACTIONS_CLASS,
  PANEL_HEADER_LABEL_CLASS,
  PANEL_HEADER_SUBTITLE_CLASS,
  PLAYGROUND_HEADER_BADGE_CLASS,
  PLAYGROUND_HEADER_DESCRIPTION,
  PLAYGROUND_HEADER_ROW_CLASS,
} from '@/app/Nav/constants'

export interface PlaygroundPanelHeaderProps {
  /** Right-side badge: string (e.g. "GET /api/holiday") or ReactNode for dynamic content */
  badge: React.ReactNode
  /** Optional subtitle; defaults to PLAYGROUND_HEADER_DESCRIPTION */
  subtitle?: string
}

/**
 * Shared header for all Playground panels: left block ("Playground" + subtitle), right block (badge).
 * Same row layout and vertical centering as DocPanelHeader.
 */
export function PlaygroundPanelHeader(props: PlaygroundPanelHeaderProps) {
  const { badge, subtitle = PLAYGROUND_HEADER_DESCRIPTION } = props
  const badgeContent = typeof badge === 'string' ? <span className={PLAYGROUND_HEADER_BADGE_CLASS}>{badge}</span> : badge
  return (
    <div className={PLAYGROUND_HEADER_ROW_CLASS}>
      <div className="min-w-0 flex-1 flex flex-col">
        <span className={PANEL_HEADER_LABEL_CLASS}>Playground</span>
        <p className={PANEL_HEADER_SUBTITLE_CLASS}>{subtitle}</p>
      </div>
      <div className={`shrink-0 ${PANEL_HEADER_ACTIONS_CLASS}`}>{badgeContent}</div>
    </div>
  )
}
