import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * News Function Calling page: tools scoped to the news category.
 */
export default function NewsFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="News tools (list_news_sources, get_news_feed) are exposed as OpenAI-compatible functions. Use get_news_feed.params.list for the same flat slug as /news/[slug]."
      defaultToolsCategory="news"
    />
  )
}
