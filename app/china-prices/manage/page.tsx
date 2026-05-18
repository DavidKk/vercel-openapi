import { Suspense } from 'react'

import { getAllProducts } from '@/app/actions/prices/product'
import { PricesManageSkeleton } from '@/components/manage'
import { checkAccess } from '@/services/auth/access'

import { PricesManager } from './prices-manager'

/**
 * Loads products after shell renders (Suspense shows skeleton during fetch).
 * @returns Prices manager with initial data
 */
async function PricesManageContent() {
  await checkAccess({ isApiRouter: false })
  const products = await getAllProducts()
  return <PricesManager initialProducts={products} />
}

/**
 * Prices manage page. Requires authenticated session.
 * @returns Product manager page with streaming shell
 */
export default function PricesManagePage() {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <Suspense fallback={<PricesManageSkeleton />}>
        <PricesManageContent />
      </Suspense>
    </section>
  )
}
