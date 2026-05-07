'use client'

import { createContext, useContext, useReducer } from 'react'

import type { ProductType } from '@/app/actions/prices/product'

import { productReducer } from './reducer'
import type { ProductAction, ProductState } from './types'

interface ProductContextType extends ProductState {
  dispatch: React.Dispatch<ProductAction>
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

interface ProductProviderProps {
  children: React.ReactNode
  initialProducts?: ProductType[]
}

/**
 * Product provider for prices manager.
 * @param props Provider props
 * @returns Context provider
 */
export function ProductProvider({ children, initialProducts = [] }: Readonly<ProductProviderProps>) {
  const [state, dispatch] = useReducer(productReducer, {
    products: initialProducts,
    loading: false,
    error: null,
  })

  return <ProductContext.Provider value={{ ...state, dispatch }}>{children}</ProductContext.Provider>
}

/**
 * Product context hook.
 * @returns Product context
 */
export function useProductContext() {
  const context = useContext(ProductContext)
  if (!context) {
    throw new Error('useProductContext must be used within a ProductProvider')
  }
  return context
}
