'use server'

import { validateCookie } from '@/services/auth/access'
import { getGistInfo, readGistFile, writeGistFile } from '@/services/gist'

export interface HistoryRecord {
  id: number
  timestamp: string
  productType: string
  brand: string
  totalPrice: number
  totalQuantity: number
  unitPrice: number
  unitBestPrice: number
  priceLevel: string
  unit: string
}

const HISTORY_FILE_NAME = 'prices-history.json'
const MAX_HISTORY_ITEMS = 20

/**
 * Reads history list from gist.
 * @returns History records
 */
async function getHistoryFromGist(): Promise<HistoryRecord[]> {
  try {
    const { gistId, gistToken } = getGistInfo()
    const content = await readGistFile({ gistId, gistToken, fileName: HISTORY_FILE_NAME })
    return JSON.parse(content) as HistoryRecord[]
  } catch {
    return []
  }
}

/**
 * Saves history list to gist.
 * @param history History records
 * @returns Promise resolved when saved
 */
async function saveHistoryToGist(history: HistoryRecord[]): Promise<void> {
  const { gistId, gistToken } = getGistInfo()
  const content = JSON.stringify(history, null, 2)
  await writeGistFile({ gistId, gistToken, fileName: HISTORY_FILE_NAME, content })
}

/**
 * Gets history list by optional product type.
 * Unauthenticated users can only read empty history.
 * @param productType Product name filter
 * @returns Filtered history list
 */
export async function getHistoryList(productType?: string): Promise<HistoryRecord[]> {
  if (!(await validateCookie())) {
    return []
  }

  const history = await getHistoryFromGist()
  if (!productType) {
    return history
  }

  return history.filter((item) => item.productType === productType)
}

/**
 * Adds one history record with auth protection.
 * @param record Record without id and timestamp
 * @returns Updated history list
 */
export async function addHistoryItem(record: Omit<HistoryRecord, 'id' | 'timestamp'>): Promise<HistoryRecord[]> {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  const history = await getHistoryFromGist()
  const maxId = history.length > 0 ? Math.max(...history.map((item) => item.id)) : 0
  const now = new Date()
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const newItem: HistoryRecord = {
    ...record,
    id: maxId + 1,
    timestamp,
  }
  const nextHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS)
  await saveHistoryToGist(nextHistory)
  return nextHistory
}
