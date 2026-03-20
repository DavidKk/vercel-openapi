'use client'

import { useMemo, useRef, useState } from 'react'

import type { ProductType } from '@/app/actions/prices/product'
import { importProductsFromJsonText, replaceProductsInKv } from '@/app/actions/prices/product'
import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'
import { ProductProvider, useProductActions } from '@/app/prices/contexts/product'
import { useNotification } from '@/components/Notification'
import { useAction } from '@/hooks/useAction'

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
  const { products, loading, removeProductAction, loadProducts, setProducts } = useProductActions()
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const notification = useNotification()
  const [draftProducts, setDraftProducts] = useState<ProductType[] | null>(null)
  const [draftDirty, setDraftDirty] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [productFilterText, setProductFilterText] = useState('')

  const [importProductsAction, importing] = useAction(
    async (text: string) => {
      try {
        const result = await importProductsFromJsonText(text)
        setDraftProducts(result.products)
        setDraftDirty(true)
        setProducts(result.products)
        setSelectedProductId(null)
        setIsCreating(false)
        notification.success(`Imported ${result.imported} products${result.skipped ? ` (skipped ${result.skipped})` : ''}`)
        return result
      } catch (error) {
        notification.error(error instanceof Error ? error.message : 'Import failed')
        throw error
      }
    },
    [setProducts, notification]
  )

  async function handleImportFile(file: File) {
    const text = await file.text()
    await importProductsAction(text)
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  const [saveDraftAction, savingKv] = useAction(async () => {
    try {
      if (!draftProducts) {
        throw new Error('No draft products to save')
      }
      await replaceProductsInKv(draftProducts)
      await loadProducts()
      setDraftDirty(false)
      setDraftProducts(null)
      notification.success('Saved imported products')
    } catch (error) {
      notification.error(error instanceof Error ? error.message : 'Save failed')
      throw error
    }
  }, [draftProducts, loadProducts, notification])

  function downloadTextFile(fileName: string, text: string, mimeType: string) {
    const blob = new Blob([text], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function handleExportClick() {
    const jsonText = JSON.stringify(products, null, 2)
    downloadTextFile('products.json', jsonText, 'application/json;charset=utf-8')
  }

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
    if (draftDirty) {
      const base = draftProducts ?? products
      const next = base.filter((item) => item.id !== productId)
      setDraftProducts(next)
      setProducts(next)
      if (selectedProductId === productId) {
        setSelectedProductId(null)
        setIsCreating(false)
      }
      return
    }

    await removeProductAction(productId)
    if (selectedProductId === productId) {
      setSelectedProductId(null)
      setIsCreating(false)
    }
  }

  const formProduct = isCreating ? null : selectedProduct

  async function createDraftProduct(product: Omit<ProductType, 'id'>): Promise<ProductType> {
    const base = draftProducts ?? products

    const duplicated = base.find((item) => item.name === product.name && (item.brand ?? '') === (product.brand ?? ''))
    if (duplicated) {
      throw new Error(`Product "${product.name}" with brand "${product.brand ?? ''}" already exists`)
    }

    const sameName = base.find((item) => item.name === product.name)
    if (sameName && sameName.unit !== product.unit) {
      throw new Error(`Product "${product.name}" already exists with unit "${sameName.unit}", can not create with "${product.unit}"`)
    }

    const maxId = base.length > 0 ? Math.max(...base.map((item) => Number(item.id) || 0)) : -1
    const created: ProductType = { ...product, id: String(maxId + 1) }
    const next = [...base, created]
    setDraftProducts(next)
    setProducts(next)
    return created
  }

  async function updateDraftProduct(id: string, updates: Partial<ProductType>): Promise<ProductType | null> {
    const base = draftProducts ?? products
    const index = base.findIndex((item) => item.id === id)
    if (index < 0) return null

    const merged = { ...base[index], ...updates }

    const duplicated = base.find((item) => item.id !== id && item.name === merged.name && (item.brand ?? '') === (merged.brand ?? ''))
    if (duplicated) {
      throw new Error(`Product "${merged.name}" with brand "${merged.brand ?? ''}" already exists`)
    }

    const sameName = base.find((item) => item.id !== id && item.name === merged.name)
    if (sameName && sameName.unit !== merged.unit) {
      throw new Error(`Product "${merged.name}" already exists with unit "${sameName.unit}", can not update to "${merged.unit}"`)
    }

    const next = [...base]
    next[index] = merged
    setDraftProducts(next)
    setProducts(next)
    return merged
  }

  // Draft deletion is handled via the list (ProductList).

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <div className={`${CONTENT_HEADER_CLASS} bg-white`}>
        <h1 className="min-w-0 truncate text-sm font-semibold text-gray-900">Prices Manager</h1>

        <div className="ml-auto flex min-w-max items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <input
            type="text"
            value={productFilterText}
            onChange={(e) => setProductFilterText(e.target.value)}
            placeholder="Search products..."
            className="h-8 w-56 flex-shrink-0 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-800 outline-none transition-colors focus:border-gray-500"
          />

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                await handleImportFile(file)
              } finally {
                if (importInputRef.current) {
                  importInputRef.current.value = ''
                }
              }
            }}
          />

          <button
            type="button"
            disabled={loading || importing || savingKv}
            onClick={() => {
              setSelectedProductId(null)
              setIsCreating(true)
            }}
            className="h-8 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            title="Add a new product"
          >
            Add product
          </button>

          <button
            type="button"
            onClick={handleExportClick}
            disabled={importing || loading}
            className="h-8 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            title="Export products JSON"
          >
            Export
          </button>

          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            className="h-8 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>

          <button
            type="button"
            disabled={!draftDirty || savingKv || importing || loading}
            onClick={() => void saveDraftAction()}
            className="h-8 shrink-0 rounded-md bg-gray-900 px-3 text-xs font-medium text-white shadow-sm hover:bg-black disabled:opacity-50"
          >
            {savingKv ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full w-full">
          <div className="w-1/2 min-w-0 h-full min-h-0 border-r border-gray-200 pr-0">
            <ProductList
              products={products}
              selectedProduct={selectedProduct}
              onProductSelect={(product) => {
                setSelectedProductId(product.id)
                setIsCreating(false)
              }}
              filterText={productFilterText}
              onProductDeleted={handleDelete}
              loading={loading}
            />
          </div>
          <div className="w-1/2 min-w-0 h-full min-h-0 pl-0">
            <ProductForm
              product={formProduct}
              onCancel={handleCancelForm}
              afterSaved={handleSaved}
              showEmptyState={!isCreating}
              draftMode={draftDirty}
              onDraftCreate={createDraftProduct}
              onDraftUpdate={updateDraftProduct}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
