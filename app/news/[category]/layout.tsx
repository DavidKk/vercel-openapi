interface NewsCategoryFeedLayoutProps {
  children: React.ReactNode
}

/**
 * Layout for `/news/[category]` feed routes: manifest category is in the path; list facets use `tag`, `keyword`, and `source` query params.
 * @param props Next.js layout children
 * @returns Section wrapper for the feed subtree
 */
export default function NewsCategoryFeedLayout(props: Readonly<NewsCategoryFeedLayoutProps>) {
  const { children } = props
  return <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{children}</section>
}
