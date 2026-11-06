/** Route prefixes that hide global Nav (e.g. full-screen calendar/pages) */
export const HIDDEN_ROUTES: string[] = ['/china-holiday', '/china-fuel-price', '/exchange-rate', '/dns']

/**
 * Shared icon button shell for global header nav + module sidebar (same size / radius).
 * Pair with active/inactive tone classes below.
 */
export const NAV_ICON_BTN_CLASS = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors'

/** Inactive tone for {@link NAV_ICON_BTN_CLASS}. */
export const NAV_ICON_BTN_INACTIVE_CLASS = 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'

/** Active tone for global header module links. */
export const NAV_ICON_BTN_ACTIVE_HEADER_CLASS = 'bg-gray-200 text-gray-900 ring-1 ring-gray-300 ring-inset'

/** Active tone for module sidebar links. */
export const NAV_ICON_BTN_ACTIVE_SIDEBAR_CLASS = 'bg-gray-900 text-white shadow-sm hover:bg-gray-800 hover:text-white'

/**
 * Content spacing tokens — use only these for page chrome padding (headers, bodies, playground).
 * Do not invent ad-hoc `px-*` / `py-*` on content surfaces; pick one of the kinds below.
 *
 * Default content pad keeps **equal** left/right and top/bottom so panels do not feel flush to the edge.
 * Compact `CONTENT_INSET_Y` is only for the title/toolbar header row.
 *
 * | Token | Classes | Use for |
 * | --- | --- | --- |
 * | {@link CONTENT_INSET_X_CLASS} | `px-4` | Horizontal page inset only |
 * | {@link CONTENT_INSET_Y_CLASS} | `py-2` | Compact vertical — ContentPageHeader title row only |
 * | {@link CONTENT_INSET_Y_LG_CLASS} | `py-4` | Same as content pad vertical (alias for composing) |
 * | {@link CONTENT_PAD_CLASS} | `p-4` | Default content pad (equal X/Y) |
 * | {@link CONTENT_PAD_NESTED_CLASS} | `p-2` | Nested boxes inside an already-padded parent |
 * | {@link CONTENT_PAD_DENSE_CLASS} | `px-3 py-2` | Dense table cells / compact list rows |
 */
export const CONTENT_INSET_X_CLASS = 'px-4'
export const CONTENT_INSET_Y_CLASS = 'py-2'
export const CONTENT_INSET_Y_LG_CLASS = 'py-4'
/** Equal inset on all sides — preferred for doc/playground/overview content. */
export const CONTENT_PAD_CLASS = 'p-4'
export const CONTENT_PAD_NESTED_CLASS = 'p-2'
export const CONTENT_PAD_DENSE_CLASS = 'px-3 py-2'

/**
 * Legacy content header row — prefer {@link ContentPageHeader} for new work.
 * Kept for gradual migration: compact padding, stretch row, no native scrollbar (use ScrollArea for tools).
 */
export const CONTENT_HEADER_CLASS = `relative flex shrink-0 min-w-0 flex-nowrap items-stretch gap-3 border-b border-gray-200 ${CONTENT_INSET_X_CLASS} pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`

/** Content/overview page title: compact xs, bold to contrast description. */
export const CONTENT_PAGE_TITLE_CLASS = 'min-w-0 truncate text-xs font-semibold leading-tight text-gray-900'

/** Same typography as {@link CONTENT_PAGE_TITLE_CLASS} without truncation layout (e.g. market dropdown trigger). */
export const CONTENT_PAGE_TITLE_TEXT_CLASS = 'text-xs font-semibold leading-tight text-gray-900'

/** Min height for doc/playground panel headers so left and right align */
const PANEL_HEADER_MIN_H = 'min-h-[3.5rem]'

/** Shared typography: doc/playground/skill panel title (h1) */
export const PANEL_HEADER_TITLE_CLASS = 'text-sm font-semibold leading-tight text-gray-900'

/** Shared typography: doc panel description (p) */
export const PANEL_HEADER_SUBTITLE_CLASS = 'mt-1 text-xs leading-tight text-gray-500'

/** Shared typography: playground/skill column label (left side of header row) */
export const PANEL_HEADER_LABEL_CLASS = 'text-sm font-medium leading-tight text-gray-700'

/** Right-side actions in panel header: keep buttons/icons vertically centered */
export const PANEL_HEADER_ACTIONS_CLASS = 'flex items-center gap-2'

/** Base styles for doc/playground panel headers (border, padding, min-height). Add flex direction at use site. */
export const DOC_PANEL_HEADER_BASE_CLASS = `shrink-0 border-b border-gray-200 ${CONTENT_PAD_CLASS} ${PANEL_HEADER_MIN_H}`

/** Playground/doc row header: base + row layout (left: title/label, right: actions), vertically centered */
export const PLAYGROUND_HEADER_ROW_CLASS = `${DOC_PANEL_HEADER_BASE_CLASS} flex flex-row items-center justify-between gap-4`

/** Default description for Playground panel header (when using DOC_PANEL_HEADER_CLASS + subtitle) */
export const PLAYGROUND_HEADER_DESCRIPTION = 'Send requests and view responses.'

/** Badge style for Playground panel header (method + path) */
export const PLAYGROUND_HEADER_BADGE_CLASS = 'rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono leading-tight text-gray-600'

/** Scrollable doc body under DocPanelHeader — uses {@link CONTENT_PAD_CLASS}. */
export const DOC_PANEL_BODY_CLASS = `min-h-0 flex-1 overflow-y-auto ${CONTENT_PAD_CLASS} text-[11px] text-gray-800`

/** Alias of {@link CONTENT_PAD_CLASS} for playground section chrome. */
export const PLAYGROUND_SECTION_PAD_CLASS = CONTENT_PAD_CLASS

/** Playground Request / Response section title row. */
export const PLAYGROUND_SECTION_HEADER_CLASS = `flex shrink-0 items-center justify-between border-b border-gray-100 ${CONTENT_PAD_CLASS} text-[11px]`

/** Stacked playground section header (title + helper copy). */
export const PLAYGROUND_SECTION_HEADER_STACKED_CLASS = `flex shrink-0 flex-col gap-1 border-b border-gray-100 ${CONTENT_PAD_CLASS} text-[11px]`

/** Playground Request form / fields body. */
export const PLAYGROUND_SECTION_BODY_CLASS = `flex flex-col gap-2 ${CONTENT_PAD_CLASS} text-[11px] text-gray-700`

/** Playground response viewer — same inset as Request body ({@link CONTENT_PAD_CLASS}). */
export const PLAYGROUND_RESPONSE_BODY_CLASS = `min-h-0 flex-1 overflow-auto ${CONTENT_PAD_CLASS} text-[10px] leading-relaxed text-gray-800`

/** Doc panel: section title (e.g. "Endpoints") */
export const DOC_SECTION_TITLE_CLASS = 'mb-1 text-[11px] font-semibold text-gray-900'

/** Doc panel: container for one endpoint block (rounded box) */
export const DOC_ENDPOINT_BOX_CLASS = 'mb-2 rounded-md bg-gray-50 p-2'

/** Doc panel: path/code next to method badge */
export const DOC_ENDPOINT_PATH_CLASS = 'font-mono text-[11px] text-gray-900'

/** Doc panel: description paragraph under endpoint row */
export const DOC_ENDPOINT_DESC_CLASS = 'mt-1 text-[11px] text-gray-600'

/**
 * Legacy filter/dropdown trigger — prefer content-header filter button classes in page toolbars.
 * Kept for gradual migration; height matches header controls (`h-8`).
 */
export const FILTER_BUTTON_CLASS =
  'inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium leading-none text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900'

export const DEFAULT_NAV = {
  $private: [
    { name: 'china-holiday', href: '/china-holiday' },
    { name: 'china-fuel-price', href: '/china-fuel-price' },
  ],
}
