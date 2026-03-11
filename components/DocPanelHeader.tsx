import { DOC_PANEL_HEADER_BASE_CLASS, PANEL_HEADER_ACTIONS_CLASS, PANEL_HEADER_SUBTITLE_CLASS, PANEL_HEADER_TITLE_CLASS } from '@/app/Nav/constants'

export interface DocPanelHeaderProps {
  /** Panel title (e.g. "Holiday API", "Skill") */
  title: string
  /** Short description below the title */
  subtitle: string
  /** Optional right-side actions (e.g. Copy/Download buttons, method badge) */
  actions?: React.ReactNode
}

/**
 * Shared header for doc/skill panels: left block (title + subtitle), right block (actions) vertically centered.
 * Uses flex layout so the right block is one unit, not buttons directly beside the title.
 */
export function DocPanelHeader(props: DocPanelHeaderProps) {
  const { title, subtitle, actions } = props
  return (
    <header className={`${DOC_PANEL_HEADER_BASE_CLASS} flex flex-row items-center justify-between gap-4`}>
      <div className="min-w-0 flex-1 flex flex-col">
        <h1 className={PANEL_HEADER_TITLE_CLASS}>{title}</h1>
        <p className={PANEL_HEADER_SUBTITLE_CLASS}>{subtitle}</p>
      </div>
      {actions != null ? <div className={`flex shrink-0 items-center ${PANEL_HEADER_ACTIONS_CLASS}`}>{actions}</div> : null}
    </header>
  )
}
