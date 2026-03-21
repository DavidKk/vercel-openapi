interface NewsListFeedLayoutProps {
  children: React.ReactNode
}

/**
 * Layout for `/news/[slug]` feed routes: flat list slug is in the path; facets use `tag`, `keyword`, and `source` query params.
 * @param props Next.js layout children
 * @returns Section wrapper for the feed subtree
 */
export default function NewsListFeedLayout(props: Readonly<NewsListFeedLayoutProps>) {
  const { children } = props
  return <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{children}</section>
}
