'use client'

import { useMemo, useState } from 'react'

import type { ProductType } from '@/app/actions/prices/product'
import { ProductProvider, useProductActions } from '@/app/prices/contexts/product'

import { ProductForm } from './components/ProductForm'
import { ProductList } from './components/ProductList'

interface PricesManagerProps {
  initialProducts: ProductType[]
}

/**
 * Product management panel for prices module with complete calc interactions.
 * @param props Manager props
 * @returns Product management UI
 */
export function PricesManager(props: Readonly<PricesManagerProps>) {
  const { initialProducts } = props
  return (
    <ProductProvider initialProducts={initialProducts}>
      <PricesManagerContent />
    </ProductProvider>
  )
}

/**
 * Prices manager content.
 * @returns Manager content
 */
function PricesManagerContent() {
  const { products, loading, removeProductAction } = useProductActions()
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const selectedProduct = useMemo(() => products.find((item) => item.id === selectedProductId) ?? null, [products, selectedProductId])

  function handleSaved(product: ProductType) {
    setSelectedProductId(product.id)
    setIsCreating(false)
  }

  function handleCancelForm() {
    setIsCreating(false)
    setSelectedProductId(null)
  }

  async function handleDelete(productId: string) {
    await removeProductAction(productId)
    if (selectedProductId === productId) {
      setSelectedProductId(null)
      setIsCreating(false)
    }
  }

  const formProduct = isCreating ? null : selectedProduct

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
      <ProductList
        products={products}
        selectedProduct={selectedProduct}
        onProductSelect={(product) => {
          setSelectedProductId(product.id)
          setIsCreating(false)
        }}
        onAddNew={() => {
          setSelectedProductId(null)
          setIsCreating(true)
        }}
        onProductDeleted={handleDelete}
        loading={loading}
      />
      <ProductForm product={formProduct} onCancel={handleCancelForm} afterSaved={handleSaved} showEmptyState={!isCreating} />
    </div>
  )
}
