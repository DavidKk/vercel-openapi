'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TbMinus, TbPlus } from 'react-icons/tb'

import type { ProductType } from '@/app/actions/prices/product'
import { useProductActions } from '@/app/prices/contexts/product'
import { useNotification } from '@/components/Notification'
import { Spinner } from '@/components/Spinner'
import { validateProductName, validateProductUnitPrice, validateRemark, validateUnit } from '@/utils/validation'

import { createProductUnitConversionValidator } from './createProductUnitConversionValidator'
import { generateUnitConversionSuggestions } from './generateUnitConversionSuggestions'
import { ProductFormInput } from './ProductFormInput'

interface ProductFormProps {
  product?: ProductType | null
  afterSaved?: (product: ProductType) => void
  onCancel: () => void
  showEmptyState?: boolean
}

/**
 * Product add/edit form with autocomplete and conversion suggestions.
 * @param props Form props
 * @returns Product form
 */
export function ProductForm({ product, afterSaved, onCancel, showEmptyState = true }: Readonly<ProductFormProps>) {
  const notification = useNotification()
  const formRef = useRef<HTMLFormElement>(null)
  const [name, setName] = useState(product?.name || '')
  const [brand, setBrand] = useState(product?.brand || '')
  const [unit, setUnit] = useState(product?.unit || '')
  const [unitBestPrice, setUnitBestPrice] = useState(product?.unitBestPrice?.toString() || '')
  const [unitConversions, setUnitConversions] = useState<string[]>(product?.unitConversions?.length ? [...product.unitConversions] : [''])
  const [remark, setRemark] = useState(product?.remark || '')
  const { products, loadingAddProduct, loadingUpdateProduct, loadingRemoveProduct, addProductAction, updateProductAction, removeProductAction } = useProductActions()
  const [isUnitDisabled, setIsUnitDisabled] = useState(false)

  const productSuggestions = useMemo(() => {
    return Array.from(new Set(products.map((item) => item.name))).map((item) => ({ label: item, value: item }))
  }, [products])

  const unitConversionSuggestions = useMemo(() => generateUnitConversionSuggestions(unit, products), [unit, products])
  const isEditing = Boolean(product)
  const isFormSubmitting = loadingAddProduct || loadingUpdateProduct || loadingRemoveProduct
  const unitConversionValidator = useMemo(() => createProductUnitConversionValidator(unit), [unit])

  function updateFormFields(nextProduct: ProductType) {
    setName(nextProduct.name)
    setBrand(nextProduct.brand || '')
    setUnit(nextProduct.unit)
    setUnitBestPrice(nextProduct.unitBestPrice.toString())
    setUnitConversions(nextProduct.unitConversions?.length ? [...nextProduct.unitConversions] : [''])
    setRemark(nextProduct.remark || '')
  }

  function clearFormFields() {
    setName('')
    setBrand('')
    setUnit('')
    setUnitBestPrice('')
    setUnitConversions([''])
    setRemark('')
    setIsUnitDisabled(false)
  }

  function resetFormFields() {
    if (product) {
      updateFormFields(product)
      return
    }
    clearFormFields()
  }

  useEffect(() => {
    resetFormFields()
  }, [product])

  useEffect(() => {
    if (!name.trim()) {
      setIsUnitDisabled(false)
      return
    }
    const existing = isEditing && product ? products.find((item) => item.name === name.trim() && item.id !== product.id) : products.find((item) => item.name === name.trim())
    if (!existing) {
      setIsUnitDisabled(false)
      return
    }
    if (unit !== existing.unit) {
      setUnit(existing.unit)
    }
    setIsUnitDisabled(true)
    if (existing.unitConversions?.length) {
      const valid = existing.unitConversions.filter((item) => unitConversionValidator(item) === true)
      if (valid.length) {
        setUnitConversions(valid)
      }
    }
  }, [name, products, isEditing, product?.id, unit, unitConversionValidator])

  useEffect(() => {
    if (isEditing || !name.trim()) {
      return
    }
    const existing = products
      .filter((item) => item.name === name.trim())
      .sort((a, b) => Number(a.id) - Number(b.id))
      .find((item) => item.unitConversions?.length)
    if (!existing?.unitConversions?.length) {
      return
    }
    const valid = existing.unitConversions.filter((item) => unitConversionValidator(item) === true)
    if (valid.length) {
      setUnitConversions(valid)
    }
  }, [name, products, isEditing, unitConversionValidator])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !unit.trim() || !unitBestPrice.trim()) {
      notification.error('Please fill in all required fields')
      return
    }
    const price = parseFloat(unitBestPrice)
    if (Number.isNaN(price) || price <= 0) {
      notification.error('Please enter a valid unit price')
      return
    }

    const conversionsToSave: string[] = []
    for (const conversion of unitConversions) {
      if (!conversion.trim()) {
        continue
      }
      let conversionForValidation = conversion.trim()
      if (conversionForValidation.includes(' (') && conversionForValidation.endsWith(')')) {
        conversionForValidation = conversionForValidation.split(' (')[0]
      }
      const result = unitConversionValidator(conversionForValidation)
      if (result !== true) {
        notification.error(typeof result === 'string' ? result : 'Invalid unit conversion')
        return
      }
      conversionsToSave.push(conversionForValidation)
    }

    try {
      if (isEditing && product) {
        const updated = await updateProductAction(product.id, {
          name: name.trim(),
          brand: brand.trim() || undefined,
          unit: unit.trim(),
          unitBestPrice: price,
          unitConversions: conversionsToSave.length ? conversionsToSave : undefined,
          remark: remark.trim() || undefined,
        })
        if (!updated) {
          throw new Error('Failed to update product')
        }
        notification.success('Product updated successfully')
        afterSaved?.(updated)
        return
      }

      const created = await addProductAction({
        name: name.trim(),
        brand: brand.trim() || undefined,
        unit: unit.trim(),
        unitBestPrice: price,
        unitConversions: conversionsToSave.length ? conversionsToSave : undefined,
        remark: remark.trim() || undefined,
      })
      if (!created) {
        throw new Error('Failed to create product')
      }
      notification.success('Product created successfully')
      afterSaved?.(created)
      clearFormFields()
    } catch (error) {
      notification.error(error instanceof Error ? error.message : 'Failed to save product')
    }
  }

  async function handleDelete() {
    if (!product) {
      return
    }
    if (!confirm(`Are you sure you want to delete "${product.name}${product.brand ? ` - ${product.brand}` : ''}"?`)) {
      return
    }
    try {
      await removeProductAction(product.id)
      clearFormFields()
      onCancel()
      notification.success('Product deleted successfully')
    } catch (error) {
      notification.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  if (showEmptyState && !isEditing && !product) {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-center">
          <h2 className="text-sm font-semibold text-gray-900">Product Manager</h2>
          <p className="mt-2 text-xs text-gray-500">Select a product to edit, or click Add Product to create one.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="relative flex h-full min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{isEditing ? 'Edit Product' : 'Add Product'}</h2>
        <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-100">
          Cancel
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <ProductFormInput
          label="Product Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          validator={validateProductName}
          required
          suggestions={productSuggestions}
        />
        <ProductFormInput label="Brand" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Optional" />
        <ProductFormInput label="Unit" prefix="/" value={unit} onChange={(event) => setUnit(event.target.value)} validator={validateUnit} required disabled={isUnitDisabled} />
        <ProductFormInput
          label="Unit Price"
          prefix="¥"
          value={unitBestPrice}
          onChange={(event) => setUnitBestPrice(event.target.value)}
          validator={validateProductUnitPrice}
          required
        />
        <ProductFormInput label="Remark" value={remark} onChange={(event) => setRemark(event.target.value)} validator={validateRemark} placeholder="Optional" />

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-600">Unit Conversions</label>
          {unitConversions.map((conversion, index) => (
            <div key={`${index}-${conversion}`} className="flex items-center gap-2">
              <div className="flex-1">
                <ProductFormInput
                  label=""
                  prefix="="
                  value={conversion}
                  onChange={(event) => {
                    const next = [...unitConversions]
                    next[index] = event.target.value
                    setUnitConversions(next)
                  }}
                  validator={unitConversionValidator}
                  suggestions={unitConversionSuggestions}
                  placeholder="e.g. 100ml"
                />
              </div>
              {unitConversions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setUnitConversions((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded border border-gray-300 p-2 text-gray-600 transition hover:bg-gray-100"
                >
                  <TbMinus className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
          {unitConversions.length < 5 ? (
            <button
              type="button"
              onClick={() => setUnitConversions((prev) => [...prev, ''])}
              className="inline-flex w-fit items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-100"
            >
              <TbPlus className="h-4 w-4" />
              Add Unit Conversion
            </button>
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {isEditing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isFormSubmitting}
              className="h-10 rounded-lg border border-red-300 bg-red-50 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isFormSubmitting}
            className="h-10 rounded-lg bg-gray-900 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? 'Update' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              resetFormFields()
              formRef.current?.dispatchEvent(new Event('reset'))
            }}
            className="h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Reset
          </button>
        </div>
      </form>

      {isFormSubmitting ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
          <Spinner color="text-gray-700" />
        </div>
      ) : null}
    </section>
  )
}
