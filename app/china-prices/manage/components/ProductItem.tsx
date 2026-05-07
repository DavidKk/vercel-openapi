'use client'

import type { ProductType } from '@/app/actions/prices/product'

interface ProductItemProps {
  product: ProductType
  isSelected: boolean
  onSelect: () => void
  onDelete: (event: React.MouseEvent) => void
  disabled?: boolean
}

/**
 * Product row card in manager list.
 * @param props Product item props
 * @returns Product item node
 */
export function ProductItem({ product, isSelected, onSelect, onDelete, disabled = false }: Readonly<ProductItemProps>) {
  const displayName = product.brand ? `${product.name} - ${product.brand}` : product.name

  return (
    <div
      onClick={!disabled ? onSelect : undefined}
      className={`w-full px-2 py-1.5 text-left transition ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50'} ${isSelected ? 'bg-gray-100' : 'bg-white'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm text-gray-900 leading-tight">{displayName}</div>
          {product.remark ? <div className="mt-0.5 truncate text-[11px] text-gray-500 leading-tight">{product.remark}</div> : null}
          <div className="mt-0.5 truncate text-xs text-gray-700 leading-tight">
            {product.unitBestPrice} / {product.unit}
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDelete(event)
          }}
          className="h-7 shrink-0 rounded border border-gray-300 px-2 text-[11px] text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          disabled={disabled}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
