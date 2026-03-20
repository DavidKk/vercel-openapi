/** @format */
'use client'

import { Highlight, themes } from 'prism-react-renderer'
import { useMemo } from 'react'

export interface CompactJsonViewerProps {
  /** Raw JSON/text content returned by an API playground */
  value: string
}

/**
 * Compact JSON viewer with Prism highlighting (best-effort).
 * - Uses smaller monospace font for playground response areas.
 * - If `value` is not valid JSON, renders it as-is.
 * @param props Component props
 * @returns Highlighted JSON/pre block
 */
export function CompactJsonViewer(props: CompactJsonViewerProps) {
  const { value } = props

  const { code, language } = useMemo(() => {
    const raw = value ?? ''
    if (!raw) return { code: '', language: 'json' as const }

    try {
      const parsed = JSON.parse(raw)
      return { code: JSON.stringify(parsed, null, 2), language: 'json' as const }
    } catch {
      return { code: raw, language: 'json' as const }
    }
  }, [value])

  if (!code) {
    return <pre className="m-0 whitespace-pre-wrap break-words text-[10px] leading-[1.35]" />
  }

  return (
    <Highlight theme={themes.vsLight} code={code} language={language}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={`${className} m-0 whitespace-pre-wrap break-words rounded-md bg-white p-2 text-[10px] leading-[1.35]`} style={{ ...style, backgroundColor: 'transparent' }}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, className: 'block' })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}
