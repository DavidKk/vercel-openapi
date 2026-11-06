'use client'

import { useCallback, useEffect, useState } from 'react'
import { RiFileCopy2Line } from 'react-icons/ri'
import { TbBookDownload } from 'react-icons/tb'

import { CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS, CONTENT_PAGE_HEADER_ICON_BTN_CLASS, ContentPageHeader } from '@/components/ContentPageHeader'
import { FilterToggle } from '@/components/FilterToggle'
import { useNotification } from '@/components/Notification'

import { ProxyRuleClashYamlSnippet } from './ProxyRuleClashYamlSnippet'
import { resolveTailscaleHostname } from './tailscale-hostname'

export interface ProxyRuleOverviewClientProps {
  /** Placeholder secret embedded in the sample YAML */
  secret: string
  /** Clash rule action names for rule-providers */
  actions: string[]
}

/**
 * Proxy rule overview: ContentPageHeader + DNS/TUN/Tailscale FilterToggle + full-height YAML sample.
 * @param props Overview props
 * @returns Overview client UI
 */
export function ProxyRuleOverviewClient(props: ProxyRuleOverviewClientProps) {
  const { secret, actions } = props
  const [yamlText, setYamlText] = useState('')
  const [includeDns, setIncludeDns] = useState(true)
  const [includeTun, setIncludeTun] = useState(true)
  const [includeTailscale, setIncludeTailscale] = useState(true)
  const [tailscaleHostname, setTailscaleHostname] = useState('device')
  const { success } = useNotification()

  useEffect(() => {
    setTailscaleHostname(resolveTailscaleHostname(navigator.userAgent))
  }, [])

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
      <ContentPageHeader title="Clash rules" description="Preview the merged Clash sample. Toggle DNS / TUN / Tailscale, then copy or download." className="bg-white">
        <div className={CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS}>
          <FilterToggle pressed={includeDns} onPressedChange={setIncludeDns} title="Toggle DNS block" aria-label="Include DNS block">
            DNS
          </FilterToggle>
          <FilterToggle pressed={includeTun} onPressedChange={setIncludeTun} title="Toggle TUN block" aria-label="Include TUN block">
            TUN
          </FilterToggle>
          <FilterToggle
            pressed={includeTailscale}
            onPressedChange={setIncludeTailscale}
            title={`Toggle Tailscale proxy (hostname: ${tailscaleHostname})`}
            aria-label="Include Tailscale proxy"
          >
            Tailscale
          </FilterToggle>
          <button type="button" onClick={handleCopyHeader} className={CONTENT_PAGE_HEADER_ICON_BTN_CLASS} title="Copy sample YAML" aria-label="Copy sample Clash YAML">
            <RiFileCopy2Line className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={handleDownload} className={CONTENT_PAGE_HEADER_ICON_BTN_CLASS} title="Download sample YAML" aria-label="Download sample Clash YAML">
            <TbBookDownload className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </ContentPageHeader>

      <ProxyRuleClashYamlSnippet
        secret={secret}
        actions={actions}
        includeDns={includeDns}
        includeTun={includeTun}
        includeTailscale={includeTailscale}
        tailscaleHostname={tailscaleHostname}
        hideCopyButton
        onYamlTextChange={setYamlText}
      />
    </div>
  )
}
