import { getAllProducts } from '@/app/actions/prices/product'
import { api } from '@/initializer/controller'
import { CACHE_CONTROL_GIST_CATALOG, jsonSuccess } from '@/initializer/response'

export const runtime = 'edge'

/**
 * Public prices index endpoint.
 * Returns supported price list names and all products.
 */
export const GET = api(async () => {
  const products = await getAllProducts()
  const listMap = new Map<string, { name: string; count: number }>()
  for (const product of products) {
    const item = listMap.get(product.name)
    if (!item) {
      listMap.set(product.name, { name: product.name, count: 1 })
      continue
    }
    item.count += 1
  }

  return jsonSuccess(
    {
      lists: Array.from(listMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      products,
      totalLists: listMap.size,
      totalProducts: products.length,
    },
    {
      headers: new Headers({
        Charset: 'utf-8',
        'Content-Type': 'application/json',
        'Cache-Control': CACHE_CONTROL_GIST_CATALOG,
      }),
    }
  )
})
