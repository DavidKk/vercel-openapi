/** Route prefixes that hide global Nav (e.g. full-screen calendar/pages) */
export const HIDDEN_ROUTES: string[] = ['/holiday', '/fuel-price', '/geo', '/exchange-rate', '/dns']

/** Same height for all content section headers (Calendar toolbar, FuelPrice bar). No wrap; horizontal scroll when long. */
export const CONTENT_HEADER_CLASS = 'flex shrink-0 min-w-0 flex-nowrap items-center gap-2 overflow-x-auto border-b border-gray-200 px-4 py-3'

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
export const DOC_PANEL_HEADER_BASE_CLASS = `shrink-0 border-b border-gray-200 px-4 py-3 ${PANEL_HEADER_MIN_H}`

/** Playground/doc row header: base + row layout (left: title/label, right: actions), vertically centered */
export const PLAYGROUND_HEADER_ROW_CLASS = `${DOC_PANEL_HEADER_BASE_CLASS} flex flex-row items-center justify-between gap-4`

/** Default description for Playground panel header (when using DOC_PANEL_HEADER_CLASS + subtitle) */
export const PLAYGROUND_HEADER_DESCRIPTION = 'Send requests and view responses.'

/** Badge style for Playground panel header (method + path) */
export const PLAYGROUND_HEADER_BADGE_CLASS = 'rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono leading-tight text-gray-600'

/** Doc panel: section title (e.g. "Endpoints") */
export const DOC_SECTION_TITLE_CLASS = 'mb-1 text-[11px] font-semibold text-gray-900'

/** Doc panel: container for one endpoint block (rounded box) */
export const DOC_ENDPOINT_BOX_CLASS = 'mb-2 rounded-md bg-gray-50 p-2'

/** Doc panel: path/code next to method badge */
export const DOC_ENDPOINT_PATH_CLASS = 'font-mono text-[11px] text-gray-900'

/** Doc panel: description paragraph under endpoint row */
export const DOC_ENDPOINT_DESC_CLASS = 'mt-1 text-[11px] text-gray-600'

/** Same size for filter/dropdown trigger buttons (e.g. 节日, 地区) */
export const FILTER_BUTTON_CLASS = 'flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50'

export const DEFAULT_NAV = {
  $private: [
    { name: 'Holiday', href: '/holiday' },
    { name: 'China Fuel Price', href: '/fuel-price' },
    { name: 'Geolocation', href: '/geo' },
  ],
}
