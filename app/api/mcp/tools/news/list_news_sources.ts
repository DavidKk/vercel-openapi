import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { normalizeNewsSubcategory } from '@/services/news/news-subcategories'
import { filterNewsSources, getNewsFeedBaseUrl } from '@/services/news/sources'

/**
 * MCP tool: list configured RSS/news sources (optional filters).
 */
export const list_news_sources = tool(
  'list_news_sources',
  'List RSS sources from the news manifest. Optional category, sub (flat list slug when category is set; default first list slug for that category), region (cn, hk_tw, intl). Returns { sources, baseUrl }.',
  z.object({
    category: z.enum(['general-news', 'tech-internet', 'game-entertainment', 'science-academic']).optional().describe('Filter by phase-1 category'),
    sub: z.string().min(1).max(48).optional().describe('Flat list slug when category is set (same as /news/[slug] segment)'),
    region: z.enum(['cn', 'hk_tw', 'intl']).optional().describe('Filter by region'),
  }),
  async (params) => {
    const subNorm = params.category !== undefined ? normalizeNewsSubcategory(params.category, params.sub) : undefined
    const sources = filterNewsSources(params.category, params.region, subNorm)
    return { sources, baseUrl: getNewsFeedBaseUrl() }
  }
)
