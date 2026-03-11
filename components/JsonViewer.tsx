import type { ReactElement } from 'react'

interface JsonViewerProps {
  value?: string
}

/**
 * Simple JSON viewer: pretty-prints JSON with 2-space indent. No syntax highlighting.
 * If the string is not valid JSON, it is shown as-is.
 * @param props Component props containing the raw JSON string
 * @returns Preformatted block with formatted JSON
 */
export function JsonViewer(props: Readonly<JsonViewerProps>): ReactElement {
  const { value } = props

  if (!value) {
    return <pre className="whitespace-pre-wrap break-words" />
  }

  let formatted = value
  try {
    const parsed = JSON.parse(value)
    formatted = JSON.stringify(parsed, null, 2)
  } catch {
    // Not valid JSON, keep original
  }

  return <pre className="whitespace-pre-wrap break-words">{formatted}</pre>
}
