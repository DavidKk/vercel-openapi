'use client'

import { useCallback } from 'react'

import type { ProductType } from '@/app/actions/prices/product'
import { createProduct, deleteProduct, getAllProducts, updateProduct } from '@/app/actions/prices/product'
import { useAction } from '@/hooks/useAction'

import { useProductContext } from './ProductContext'

/**
 * Product action hooks.
 * @returns Product actions and states
 */
export function useProductActions() {
  const { products, loading, dispatch } = useProductContext()

  const setProducts = useCallback(
    (next: ProductType[]) => {
      dispatch({ type: 'SET_PRODUCTS', payload: next })
    },
    [dispatch]
  )

  const [loadProducts, loadingLoadProducts, errorLoadProducts] = useAction(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const loadedProducts = await getAllProducts()
      dispatch({ type: 'SET_PRODUCTS', payload: loadedProducts })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const [addProductAction, loadingAddProduct, errorAddProduct] = useAction(async (product: Omit<ProductType, 'id'>) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const newProduct = await createProduct(product)
      dispatch({ type: 'ADD_PRODUCT', payload: newProduct })
      return newProduct
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const [updateProductAction, loadingUpdateProduct, errorUpdateProduct] = useAction(async (id: string, updates: Partial<ProductType>) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const updatedProduct = await updateProduct(id, updates)
      if (!updatedProduct) {
        throw new Error('Failed to update product')
      }
      dispatch({ type: 'UPDATE_PRODUCT', payload: { id, updates } })
      return updatedProduct
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const [removeProductAction, loadingRemoveProduct, errorRemoveProduct] = useAction(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const success = await deleteProduct(id)
      if (!success) {
        throw new Error('Failed to delete product')
      }
      dispatch({ type: 'REMOVE_PRODUCT', payload: id })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  return {
    products,
    loading,
    loadProducts,
    setProducts,
    addProductAction,
    updateProductAction,
    removeProductAction,
    loadingLoadProducts,
    loadingAddProduct,
    loadingUpdateProduct,
    loadingRemoveProduct,
    errorLoadProducts,
    errorAddProduct,
    errorUpdateProduct,
    errorRemoveProduct,
  }
}
