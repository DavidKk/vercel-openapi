'use client'

import { Highlight, themes } from 'prism-react-renderer'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { TbCopy, TbX } from 'react-icons/tb'

import { useNotification } from '@/components/Notification'
import type { RequestExampleInput, RequestExampleTabId } from '@/utils/requestExamples'
import { buildRequestExamples } from '@/utils/requestExamples'

export interface RequestExamplesPopupProps {
  /** Controls visibility */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Request inputs to generate examples */
  request: RequestExampleInput | null
  /** Default visible tab */
  defaultTab?: RequestExampleTabId
}

function CopyButton(props: { getText: () => string }) {
  const { success } = useNotification()

  return (
    <button
      type="button"
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
      title="Copy"
      aria-label="Copy"
      onClick={() => {
        const text = props.getText()
        if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
        navigator.clipboard
          .writeText(text)
          .then(() => {
            success('Copied to clipboard')
          })
          .catch(() => {})
      }}
    >
      <TbCopy className="h-4 w-4" />
    </button>
  )
}

export function RequestExamplesPopup(props: RequestExamplesPopupProps) {
  const { open, onClose, request, defaultTab = 'nodejs' } = props
  const [activeTab, setActiveTab] = useState<RequestExampleTabId>(defaultTab)

  const codes = useMemo(() => {
    if (!request) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const resolvedUrl = request.url.startsWith('/') ? `${origin}${request.url}` : request.url
    return buildRequestExamples({ ...request, url: resolvedUrl })
  }, [request])

  const tabs: { id: RequestExampleTabId; label: string }[] = [
    { id: 'curl', label: 'CURL' },
    { id: 'nodejs', label: 'JS' },
    { id: 'python', label: 'PYTHON' },
    { id: 'golang', label: 'GOLANG' },
  ]

  const codeText = !codes ? '' : activeTab === 'nodejs' ? `${codes.nodejs}\n\n// ---- FETCH variant ----\n\n${codes.fetch}` : codes[activeTab]

  const languageByTab: Record<RequestExampleTabId, string> = {
    nodejs: 'javascript',
    fetch: 'javascript',
    curl: 'bash',
    python: 'python',
    golang: 'go',
  }

  const language = languageByTab[activeTab]

  const tabBarRef = useRef<HTMLDivElement | null>(null)
  const tabButtonRefs = useRef<Partial<Record<RequestExampleTabId, HTMLButtonElement>>>({})
  const [slider, setSlider] = useState<{ leftPx: number; widthPx: number } | null>(null)

  const recalcSlider = useCallback(() => {
    const container = tabBarRef.current
    const activeEl = tabButtonRefs.current[activeTab]
    if (!container || !activeEl) return
    const cRect = container.getBoundingClientRect()
    const aRect = activeEl.getBoundingClientRect()
    setSlider({
      leftPx: aRect.left - cRect.left,
      widthPx: aRect.width,
    })
  }, [activeTab])

  useLayoutEffect(() => {
    if (!open) return
    recalcSlider()
  }, [recalcSlider, open])

  useEffect(() => {
    if (!open) return
    recalcSlider()
    window.addEventListener('resize', recalcSlider)
    return () => window.removeEventListener('resize', recalcSlider)
  }, [recalcSlider, open])

  if (!open || !codes) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Request examples</div>
          </div>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100" onClick={onClose} aria-label="Close">
            <TbX className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="flex flex-col gap-2 p-2">
          <div
            ref={tabBarRef}
            className="relative inline-flex self-start overflow-hidden rounded-md border border-gray-200 bg-white"
            role="tablist"
            aria-label="Request examples tabs"
          >
            {slider ? (
              <div
                aria-hidden="true"
                className="absolute top-1 bottom-1 rounded-md bg-gray-900 transition-transform duration-150 ease-out"
                style={{
                  transform: `translateX(${slider.leftPx + 2}px)`,
                  width: Math.max(0, slider.widthPx - 4),
                }}
              />
            ) : null}

            {tabs.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabButtonRefs.current[t.id] = el ?? undefined
                }}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={`relative z-10 whitespace-nowrap px-3 py-1.5 text-[11px] font-medium transition ${
                  activeTab === t.id ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <style jsx>{`
            .no-scrollbar {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          <div className="relative">
            <div className="relative">
              <div className="absolute right-2 top-1.5">
                <CopyButton getText={() => codeText} />
              </div>

              <Highlight theme={themes.vsLight} code={codeText} language={language}>
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    className={`${className} no-scrollbar h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-transparent p-3 font-mono text-[11px] leading-relaxed`}
                    style={{ ...style, backgroundColor: 'transparent', whiteSpace: 'pre' }}
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
          </div>
        </div>
      </div>
    </div>
  )
}
