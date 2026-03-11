'use client'

import { useCallback, useState } from 'react'

import { DocPanelHeader } from '@/components/DocPanelHeader'

const PLACEHOLDER_BASE = 'BASE_URL'

export interface ApiSkillPanelProps {
  /** Raw markdown/text content. Use BASE_URL as placeholder; replaced with origin only on copy/download. */
  content: string
  /** Filename when downloading (e.g. "exchange-rate-api-skill.md") */
  downloadFilename: string
  /** When true, panel fills available height (for full-page Skill layout). */
  fill?: boolean
}

export function ApiSkillPanel(props: ApiSkillPanelProps) {
  const { content, downloadFilename, fill = false } = props
  const [copied, setCopied] = useState(false)

  const resolveContent = useCallback(() => {
    if (typeof window === 'undefined') return content
    return content.replace(new RegExp(PLACEHOLDER_BASE, 'g'), window.location.origin)
  }, [content])

  const handleCopy = useCallback(async () => {
    const text = resolveContent()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [resolveContent])

  const handleDownload = useCallback(() => {
    const text = resolveContent()
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadFilename
    a.click()
    URL.revokeObjectURL(url)
  }, [resolveContent, downloadFilename])

  return (
    <div className={`flex flex-col bg-white ${fill ? 'min-h-0 flex-1' : ''}`}>
      <DocPanelHeader
        title="Skill"
        subtitle="API usage for agents. Copy or download the content below."
        actions={
          <>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium leading-tight text-gray-700 hover:bg-gray-50"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium leading-tight text-gray-700 hover:bg-gray-50"
            >
              Download
            </button>
          </>
        }
      />

      <pre
        className={`min-h-0 flex-1 overflow-auto whitespace-pre border-0 bg-white p-4 text-left text-[11px] leading-relaxed text-gray-800 font-mono ${fill ? '' : 'min-h-[360px]'}`}
      >
        {content}
      </pre>
    </div>
  )
}
