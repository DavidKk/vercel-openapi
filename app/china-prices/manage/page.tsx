import { getAllProducts } from '@/app/actions/prices/product'
import { checkAccess } from '@/services/auth/access'

import { PricesManager } from './prices-manager'

/**
 * Prices manage page. Requires authenticated session.
 * @returns Product manager page
 */
export default async function PricesManagePage() {
  await checkAccess({ isApiRouter: false })
  const products = await getAllProducts()

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <PricesManager initialProducts={products} />
    </section>
  )
}
