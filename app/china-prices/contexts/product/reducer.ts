import type { ProductAction, ProductState } from './types'

/**
 * Product reducer.
 * @param state Current state
 * @param action Action payload
 * @returns Next state
 */
export function productReducer(state: ProductState, action: ProductAction): ProductState {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] }
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((product) => (product.id === action.payload.id ? { ...product, ...action.payload.updates } : product)),
      }
    case 'REMOVE_PRODUCT':
      return { ...state, products: state.products.filter((product) => product.id !== action.payload) }
    case 'CLEAR_PRODUCTS':
      return { ...state, products: [] }
    default:
      return state
  }
}
