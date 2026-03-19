import type { ProductType } from '@/app/actions/prices/product'

export interface ProductState {
  products: ProductType[]
  loading: boolean
  error: Error | null
}

export type ProductAction =
  | { type: 'SET_PRODUCTS'; payload: ProductType[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'ADD_PRODUCT'; payload: ProductType }
  | { type: 'UPDATE_PRODUCT'; payload: { id: string; updates: Partial<ProductType> } }
  | { type: 'REMOVE_PRODUCT'; payload: string }
  | { type: 'CLEAR_PRODUCTS' }
