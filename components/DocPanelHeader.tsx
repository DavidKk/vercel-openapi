import { CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS, ContentPageHeader } from '@/components/ContentPageHeader'

export interface DocPanelHeaderProps {
  /** Panel title (e.g. "Holiday API", "Skill") */
  title: string
  /** Short description below the title */
  subtitle: string
  /** Optional right-side actions (e.g. Copy/Download buttons, method badge) */
  actions?: React.ReactNode
}

/**
 * Shared header for doc/skill panels — same title/description density as overview ContentPageHeader.
 *
 * @param props Header props
 * @returns Header element
 */
export function DocPanelHeader(props: DocPanelHeaderProps) {
  const { title, subtitle, actions } = props
  return (
    <ContentPageHeader title={title} description={subtitle} className="bg-white">
      {actions != null ? <div className={CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS}>{actions}</div> : null}
    </ContentPageHeader>
  )
}
