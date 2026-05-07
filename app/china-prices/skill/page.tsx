'use client'

import { useEffect, useState } from 'react'

import { moduleSkillMarkdownFilename } from '@/app/api/mcp/skillNaming'
import { ApiSkillPanel } from '@/components/ApiSkillPanel'

/**
 * Prices skill page.
 * @returns Skill panel
 */
export default function PricesSkillPage() {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/ui/skills/prices', { credentials: 'include' })
        if (!res.ok) {
          throw new Error(`Failed to load skill: HTTP ${res.status}`)
        }
        const data = (await res.json()) as { data?: { content?: string }; content?: string }
        const nextContent = data?.data?.content ?? data?.content
        if (!nextContent) {
          throw new Error('Invalid skill response')
        }
        if (!cancelled) {
          setContent(nextContent)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load skill')
          setLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (loading && content === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-sm text-gray-500">Loading skill...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={content ?? ''} downloadFilename={moduleSkillMarkdownFilename('prices')} fill />
    </div>
  )
}
