'use client'

import { useCallback, useState } from 'react'
import { ImCheckboxChecked, ImCheckboxUnchecked } from 'react-icons/im'

import { useNotification } from '@/components/Notification'

import { ProxyRuleClashYamlSnippet } from './ProxyRuleClashYamlSnippet'

/** Shared toolbar button sizing: compact on mobile, original from `sm` up. */
const PROXY_TOOLBAR_BTN_BASE = 'h-7 shrink-0 items-center rounded-md border px-2 text-xs font-medium transition-colors sm:h-9 sm:rounded-lg sm:px-3 sm:text-[11px]'

/** Toolbar button visible on all breakpoints. */
const PROXY_TOOLBAR_BTN_CLASS = `inline-flex ${PROXY_TOOLBAR_BTN_BASE}`

/** Copy/Download: hidden on mobile, same sizing from `sm` up. */
const PROXY_TOOLBAR_BTN_DESKTOP_CLASS = `hidden sm:inline-flex ${PROXY_TOOLBAR_BTN_BASE}`

export interface ProxyRuleOverviewClientProps {
  /** Placeholder secret embedded in the sample YAML */
  secret: string
  /** Clash rule action names for rule-providers */
  actions: string[]
}

/**
 * Proxy rule overview: toolbar title + Copy (same row as fuel/holiday headers), full-height YAML sample below, footer Manage hint.
 * @param props Overview props
 * @returns Overview client UI
 */
export function ProxyRuleOverviewClient(props: ProxyRuleOverviewClientProps) {
  const { secret, actions } = props
  const [yamlText, setYamlText] = useState('')
  const [includeDns, setIncludeDns] = useState(true)
  const [includeTun, setIncludeTun] = useState(true)
  const { success } = useNotification()

  const handleCopyHeader = useCallback(() => {
    if (!yamlText || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return
    }
    void navigator.clipboard.writeText(yamlText).then(() => success('Copied to clipboard'))
  }, [yamlText, success])

  const handleDownload = useCallback(() => {
    if (!yamlText) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const blob = new Blob([yamlText], { type: 'text/yaml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'proxy-rule-clash.yaml'
    a.click()
    URL.revokeObjectURL(url)
    success('Downloaded YAML')
  }, [yamlText, success])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 sm:py-3">
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700 sm:text-base">Clash rules</h1>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIncludeDns((v) => !v)}
            aria-pressed={includeDns}
            className={`${PROXY_TOOLBAR_BTN_CLASS} ${
              includeDns ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title="Toggle DNS block"
          >
            <span className="flex items-center gap-1 sm:gap-1.5">
              <span>DNS</span>
              {includeDns ? <ImCheckboxChecked className="h-3 w-3" /> : <ImCheckboxUnchecked className="h-3 w-3 text-gray-400" />}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIncludeTun((v) => !v)}
            aria-pressed={includeTun}
            className={`${PROXY_TOOLBAR_BTN_CLASS} ${
              includeTun ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title="Toggle TUN block"
          >
            <span className="flex items-center gap-1 sm:gap-1.5">
              <span>TUN</span>
              {includeTun ? <ImCheckboxChecked className="h-3 w-3" /> : <ImCheckboxUnchecked className="h-3 w-3 text-gray-400" />}
            </span>
          </button>
          <button
            type="button"
            onClick={handleCopyHeader}
            className={`${PROXY_TOOLBAR_BTN_DESKTOP_CLASS} gap-1 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900`}
            title="Copy sample YAML"
            aria-label="Copy sample Clash YAML"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className={`${PROXY_TOOLBAR_BTN_DESKTOP_CLASS} gap-1 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900`}
            title="Download sample YAML"
            aria-label="Download sample Clash YAML"
          >
            Download
          </button>
        </div>
      </header>

      <ProxyRuleClashYamlSnippet secret={secret} actions={actions} includeDns={includeDns} includeTun={includeTun} hideCopyButton onYamlTextChange={setYamlText} />
    </div>
  )
}
