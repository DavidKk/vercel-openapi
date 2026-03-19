'use client'

import { useMemo, useState } from 'react'

import type { ProductType } from '@/app/actions/prices/product'
import { Spinner } from '@/components/Spinner'

import { ProductFilter } from './ProductFilter'
import { ProductItem } from './ProductItem'

interface ProductListProps {
  products: ProductType[]
  selectedProduct: ProductType | null
  onProductSelect: (product: ProductType) => void
  onAddNew: () => void
  onProductDeleted: (productId: string) => void
  loading?: boolean
}

/**
 * Product list panel with filter and add action.
 * @param props Product list props
 * @returns Product list section
 */
export function ProductList({ products, selectedProduct, onProductSelect, onAddNew, onProductDeleted, loading = false }: Readonly<ProductListProps>) {
  const [filterText, setFilterText] = useState('')

  const filteredProducts = useMemo(() => {
    const keyword = filterText.trim().toLowerCase()
    if (!keyword) {
      return products
    }
    return products.filter((item) => `${item.name} ${item.brand ?? ''} ${item.remark ?? ''}`.toLowerCase().includes(keyword))
  }, [products, filterText])

  return (
    <section className="relative flex h-full min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Products</h2>
        <span className="text-xs text-gray-500">{filteredProducts.length} items</span>
      </div>

      <ProductFilter onFilterChange={setFilterText} />

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductItem
              key={product.id}
              product={product}
              isSelected={selectedProduct?.id === product.id}
              onSelect={() => !loading && onProductSelect(product)}
              onDelete={() => {
                if (!loading && confirm(`Are you sure you want to delete "${product.name}${product.brand ? ` - ${product.brand}` : ''}"?`)) {
                  onProductDeleted(product.id)
                }
              }}
              disabled={loading}
            />
          ))
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">No products found</div>
        )}
      </div>

      <button
        type="button"
        onClick={onAddNew}
        disabled={loading}
        className="mt-3 h-10 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add Product
      </button>

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
          <Spinner color="text-gray-700" />
        </div>
      ) : null}
    </section>
  )
}
