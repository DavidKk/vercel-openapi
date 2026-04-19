'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { inferClientPublicBaseUrl } from '@/app/api/mcp/inferClientPublicBaseUrl'
import { DocPanelHeader } from '@/components/DocPanelHeader'

const PLACEHOLDER_BASE = 'BASE_URL'

/**
 * Strip YAML front matter from markdown so the exported/copyable SKILL text
 * stays instruction-only and does not increase LLM context tokens.
 * @param markdown Input markdown
 * @returns Markdown without YAML front matter
 */
function stripYamlFrontMatter(markdown: string): string {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
}

function inferBaseUrlFromWindow(): string {
  return inferClientPublicBaseUrl()
}

/** Strip trailing markdown / prose punctuation accidentally captured after `/api/...`. */
function trimApiPathSuffix(path: string): string {
  return path.replace(/[)\],.;]+$/g, '')
}

/**
 * Turn root-relative API paths into absolute URLs for display, copy, and download.
 * Runs after `BASE_URL` substitution so markdown can use either style.
 *
 * Path match is permissive (`/api/` then non-space, non-backtick) so docs can use `{param}` placeholders.
 */
function applyApiPathOrigin(markdown: string, baseUrl: string): string {
  let out = markdown
  out = out.replace(/\b(GET|POST|PUT|DELETE|PATCH)\s+(\/api\/[^\s`]+)/gi, (_, verb: string, path: string) => {
    const p = trimApiPathSuffix(path)
    return `${verb} ${baseUrl}${p}`
  })
  out = out.replace(/`(\/api\/[^`\s]+)`/g, (_, path: string) => {
    const p = trimApiPathSuffix(path)
    return `\`${baseUrl}${p}\``
  })
  return out
}

function resolveSkillMarkdownForClient(markdown: string): string {
  const baseUrl = inferBaseUrlFromWindow()
  let s = stripYamlFrontMatter(markdown)
  s = s.replace(new RegExp(PLACEHOLDER_BASE, 'g'), baseUrl)
  s = applyApiPathOrigin(s, baseUrl)
  return s
}

export interface ApiSkillPanelProps {
  /** Raw markdown/text content. Use BASE_URL as placeholder; replaced with origin after mount (and for copy/download). */
  content: string
  /** Filename when downloading (e.g. `unbnd-exchange-rate-skill.md` from `moduleSkillMarkdownFilename`) */
  downloadFilename: string
  /** When true, panel fills available height (for full-page Skill layout). */
  fill?: boolean
}

/**
 * Skill panel that shows agent-readable instructions (markdown/text).
 * Includes Copy/Download actions and supports selecting only the panel content with Cmd/Ctrl+A.
 * @param props Skill panel properties
 * @returns Skill panel UI
 */
export function ApiSkillPanel(props: ApiSkillPanelProps) {
  const { content, downloadFilename, fill = false } = props
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const resolveContent = useCallback(() => {
    if (typeof window === 'undefined') return stripYamlFrontMatter(content)
    return resolveSkillMarkdownForClient(content)
  }, [content])

  /**
   * Must match server render on first paint to avoid hydration mismatch.
   * Replace BASE_URL only after mount via useEffect.
   */
  const [displayContent, setDisplayContent] = useState(stripYamlFrontMatter(content))

  useEffect(() => {
    setDisplayContent(resolveContent())
  }, [resolveContent])

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const pre = preRef.current
      if (!pre) return
      const target = e.target as HTMLElement | null
      const isInside = Boolean(target && pre.contains(target))
      if (!isInside) return
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key.toLowerCase() !== 'a') return

      e.preventDefault()
      const selection = window.getSelection()
      if (!selection) return
      selection.removeAllRanges()
      const range = document.createRange()
      range.selectNodeContents(pre)
      selection.addRange(range)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

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
        ref={preRef}
        tabIndex={0}
        onMouseDown={() => preRef.current?.focus()}
        onFocus={() => preRef.current?.setAttribute('data-skill-focused', 'true')}
        className={`min-h-0 flex-1 overflow-auto whitespace-pre border-0 bg-white p-4 text-left text-[11px] leading-relaxed text-gray-800 font-mono ${fill ? '' : 'min-h-[360px]'}`}
      >
        {displayContent}
      </pre>
    </div>
  )
}
