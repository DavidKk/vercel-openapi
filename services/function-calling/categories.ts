export const TOOL_CATEGORIES = ['dns', 'holiday', 'fuel-price', 'exchange-rate', 'movies', 'news', 'weather', 'finance', 'prices', 'proxy-rule'] as const

export type ToolCategory = (typeof TOOL_CATEGORIES)[number]
