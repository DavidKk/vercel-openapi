import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { filterNewsSources, getNewsFeedBaseUrl } from '@/services/news/sources'

/**
 * MCP tool: list configured RSS/news sources (optional filters).
 */
export const list_news_sources = tool(
  'list_news_sources',
  'List RSS sources from the news manifest. Optional filters: category (general-news, tech-internet, social-platform, game-entertainment, science-academic), region (cn, hk_tw). Returns { sources, baseUrl }.',
  z.object({
    category: z.enum(['general-news', 'tech-internet', 'social-platform', 'game-entertainment', 'science-academic']).optional().describe('Filter by phase-1 category'),
    region: z.enum(['cn', 'hk_tw']).optional().describe('Filter by region'),
  }),
  async (params) => {
    const sources = filterNewsSources(params.category, params.region)
    return { sources, baseUrl: getNewsFeedBaseUrl() }
  }
)
