'use client'

import { Highlight, themes } from 'prism-react-renderer'
import { useEffect, useMemo, useState } from 'react'
import { TbCopy } from 'react-icons/tb'

import { useNotification } from '@/components/Notification'

import { buildClashYamlSnippetText } from './build-clash-yaml-snippet-text'

export interface ProxyRuleClashYamlSnippetProps {
  /** Clash external-controller API secret placeholder */
  secret: string
  /** Rule-set names / actions from gist or defaults */
  actions: string[]
  /** When true, hides the floating copy button (e.g. parent header provides Copy). */
  hideCopyButton?: boolean
  /** Called when computed YAML changes (after base URL is known). */
  onYamlTextChange?: (yaml: string) => void
}

/**
 * Renders a compact, syntax-highlighted sample Clash client YAML using this deployment's public rule-set URLs.
 * @param props.secret External controller secret placeholder
 * @param props.actions Action names used for RULE-SET providers and rules
 * @param props.hideCopyButton Omit floating copy control
 * @param props.onYamlTextChange Notify parent of YAML text updates
 */
export function ProxyRuleClashYamlSnippet(props: ProxyRuleClashYamlSnippetProps) {
  const { secret, actions, hideCopyButton = false, onYamlTextChange } = props
  const { success } = useNotification()
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    const { protocol, hostname, port } = window.location
    const host = port ? `${hostname}:${port}` : hostname
    setBaseUrl(`${protocol}//${host}`)
  }, [])

  const yamlText = useMemo(() => (baseUrl ? buildClashYamlSnippetText({ baseUrl, secret, actions }) : ''), [actions, baseUrl, secret])

  useEffect(() => {
    onYamlTextChange?.(yamlText)
  }, [yamlText, onYamlTextChange])

  function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return
    }
    if (!yamlText) return
    navigator.clipboard.writeText(yamlText).then(() => success('Copied to clipboard'))
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-200 bg-gray-50/90">
      {!hideCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-1.5 top-1.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800"
          title="Copy YAML"
          aria-label="Copy YAML"
        >
          <TbCopy className="h-3.5 w-3.5" />
        </button>
      )}

      <Highlight theme={themes.vsLight} code={yamlText || ' '} language="yaml">
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} m-0 min-h-0 flex-1 overflow-auto px-2 py-1.5 font-mono text-[10px] leading-[1.35] [scrollbar-width:thin] ${hideCopyButton ? '' : 'pr-9'}`}
            style={{ ...style, backgroundColor: 'transparent', margin: 0, whiteSpace: 'pre' }}
          >
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
    </div>
  )
}
