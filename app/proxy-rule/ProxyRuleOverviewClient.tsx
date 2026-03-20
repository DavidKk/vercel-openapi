'use client'

import { useCallback, useState } from 'react'
import { ImCheckboxChecked, ImCheckboxUnchecked } from 'react-icons/im'

import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'
import { useNotification } from '@/components/Notification'

import { ProxyRuleClashYamlSnippet } from './ProxyRuleClashYamlSnippet'

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
      <div className={`${CONTENT_HEADER_CLASS} text-sm text-gray-600`}>
        <span className="text-base font-semibold text-gray-700">Clash 规则配置示例</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIncludeDns((v) => !v)}
            aria-pressed={includeDns}
            className={`inline-flex h-9 items-center rounded-lg border px-3 text-[11px] font-medium transition-colors ${
              includeDns ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title="Toggle DNS block"
          >
            <span className="flex items-center gap-1.5">
              <span>DNS</span>
              {includeDns ? <ImCheckboxChecked className="h-3 w-3" /> : <ImCheckboxUnchecked className="h-3 w-3 text-gray-400" />}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIncludeTun((v) => !v)}
            aria-pressed={includeTun}
            className={`inline-flex h-9 items-center rounded-lg border px-3 text-[11px] font-medium transition-colors ${
              includeTun ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title="Toggle TUN block"
          >
            <span className="flex items-center gap-1.5">
              <span>TUN</span>
              {includeTun ? <ImCheckboxChecked className="h-3 w-3" /> : <ImCheckboxUnchecked className="h-3 w-3 text-gray-400" />}
            </span>
          </button>
          <button
            type="button"
            onClick={handleCopyHeader}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-[11px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            title="Copy sample YAML"
            aria-label="Copy sample Clash YAML"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-[11px] font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            title="Download sample YAML"
            aria-label="Download sample Clash YAML"
          >
            Download
          </button>
        </div>
      </div>

      <ProxyRuleClashYamlSnippet secret={secret} actions={actions} includeDns={includeDns} includeTun={includeTun} hideCopyButton onYamlTextChange={setYamlText} />
    </div>
  )
}
