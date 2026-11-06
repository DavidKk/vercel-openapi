'use client'

import { useMemo } from 'react'

import type { ProductType } from '@/app/actions/prices/product'
import { CONTENT_INSET_X_CLASS } from '@/app/Nav/constants'
import { ContentPageHeader } from '@/components/ContentPageHeader'
import { ScrollArea } from '@/components/ScrollArea'
import { Spinner } from '@/components/Spinner'

import { ProductItem } from './ProductItem'

interface ProductListProps {
  products: ProductType[]
  selectedProduct: ProductType | null
  onProductSelect: (product: ProductType) => void
  filterText: string
  onProductDeleted: (productId: string) => void
  loading?: boolean
}

/**
 * Product list panel with filter and add action.
 * @param props Product list props
 * @returns Product list section
 */
export function ProductList({ products, selectedProduct, onProductSelect, filterText, onProductDeleted, loading = false }: Readonly<ProductListProps>) {
  const filteredProducts = useMemo(() => {
    const keyword = filterText.trim().toLowerCase()
    if (!keyword) {
      return products
    }
    return products.filter((item) => `${item.name} ${item.brand ?? ''} ${item.remark ?? ''}`.toLowerCase().includes(keyword))
  }, [products, filterText])

  return (
    <section className="relative flex h-full min-h-0 flex-col">
      <ContentPageHeader
        title="Products"
        description={
          <>
            <span className="md:hidden">Tap a product to open the editor.</span>
            <span className="hidden md:inline">Select a product to edit on the right.</span>
          </>
        }
        className="bg-white"
        titleClassName="text-sm font-semibold leading-tight text-gray-900"
      />

      <ScrollArea className="min-h-0 flex-1" indicator="vertical" reserveGutter={false} scrollClassName="min-h-0">
        {filteredProducts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <ProductItem
                key={product.id}
                product={product}
                isSelected={selectedProduct?.id === product.id}
                onSelect={() => !loading && onProductSelect(product)}
                onDelete={() => {
                  const confirmText = `Are you sure you want to delete "${product.name}${product.brand ? ` - ${product.brand}` : ''}"?`
                  if (loading) return
                  if (confirm(confirmText)) {
                    onProductDeleted(product.id)
                  }
                }}
                disabled={loading}
              />
            ))}
          </div>
        ) : (
          <div className={`flex h-full items-center justify-center ${CONTENT_INSET_X_CLASS} text-xs text-gray-500`}>No products found</div>
        )}
      </ScrollArea>

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <Spinner color="text-gray-700" />
        </div>
      ) : null}
    </section>
  )
}
