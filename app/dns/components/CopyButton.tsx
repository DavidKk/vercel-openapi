'use client'

import { useState } from 'react'

/**
 * Button that copies the given text to clipboard and shows a brief success state.
 * @param props.text Value to copy when clicked
 */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <button type="button" onClick={handleCopy} className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Copy" aria-label="Copy">
      {copied ? (
        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 0V6a2 2 0 00-2-2h-2m-8 0h-2a2 2 0 00-2 2v8a2 2 0 002 2h2m8 0h2a2 2 0 002-2v-2m0 0V6a2 2 0 012-2h2"
          />
        </svg>
      )}
    </button>
  )
}
