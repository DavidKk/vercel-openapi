import { getAllProducts } from '@/app/actions/prices/product'
import { api } from '@/initializer/controller'
import { invalidParameters, jsonSuccess } from '@/initializer/response'

export const runtime = 'edge'

/**
 * Public prices search endpoint.
 * Query params:
 * - q: keyword
 */
export const GET = api(async (req, context) => {
  const q = (context.searchParams.get('q') ?? '').trim().toLowerCase()
  if (!q) {
    return invalidParameters('Missing query parameter "q"').toJsonResponse(400)
  }

  const products = await getAllProducts()
  const matched = products.filter((product) => {
    const haystack = `${product.name} ${product.brand ?? ''} ${product.unit} ${product.remark ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })

  const matchedNames = Array.from(new Set(matched.map((item) => item.name))).sort((a, b) => a.localeCompare(b))

  return jsonSuccess({
    query: q,
    matchedLists: matchedNames,
    products: matched,
    total: matched.length,
  })
})
