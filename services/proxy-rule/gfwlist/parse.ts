import { isValidUrl } from '@/services/proxy-rule/url'

type RuleType = 'comment' | 'exact_url' | 'domain' | 'regex' | 'wildcard' | 'path' | 'whitelist' | 'start_with' | 'end_with' | 'full_match' | 'domain_keyword'

export interface GFWRule {
  type: RuleType
  value: string
  raw: string
}

const DOMAIN_REGEX = /^(?:\*\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/

export interface ParsedRuleOptions {
  ignoreComments?: boolean
  sortComparator?: boolean
}

/**
 * Parse gfwlist text content into structured rules.
 */
export function parseGFWList(content: string, options?: ParsedRuleOptions) {
  const { ignoreComments = true, sortComparator = true } = options || {}
  const ruleSet = new Set<GFWRule>(
    (function* () {
      for (const line of new Set(content.split('\n'))) {
        const trimedLine = line.trim()
        if (trimedLine === '') {
          continue
        }

        if (trimedLine.startsWith('!--')) {
          if (ignoreComments) {
            continue
          }

          const value = trimedLine.slice(3).trim()
          yield { type: 'comment', value, raw: trimedLine }
          continue
        }

        if (trimedLine.startsWith('!') || trimedLine.startsWith('#')) {
          if (ignoreComments) {
            continue
          }

          const value = trimedLine.slice(1).trim()
          yield { type: 'comment', value, raw: trimedLine }
          continue
        }

        if (trimedLine.startsWith('@@')) {
          const value = trimedLine.slice(2)
          yield {
            type: 'whitelist',
            value: parseRuleValue(value),
            raw: trimedLine,
          }

          continue
        }

        if (trimedLine.startsWith('/') && trimedLine.endsWith('/')) {
          yield {
            type: 'regex',
            value: trimedLine.slice(1, -1),
            raw: trimedLine,
          }

          continue
        }

        if (trimedLine.startsWith('|http')) {
          yield {
            type: 'exact_url',
            value: trimedLine.slice(1),
            raw: trimedLine,
          }
          continue
        }

        if (trimedLine.startsWith('||')) {
          const domain = trimedLine.slice(2).split(/[\^/]/)[0]
          yield {
            type: 'domain',
            value: cleanDomain(domain),
            raw: trimedLine,
          }
          continue
        }

        if (trimedLine.includes('*')) {
          yield {
            type: 'wildcard',
            value: trimedLine,
            raw: trimedLine,
          }
          continue
        }

        if (trimedLine.includes('keyword')) {
          yield {
            type: 'domain_keyword',
            value: trimedLine,
            raw: trimedLine,
          }
          continue
        }

        if (trimedLine.includes('/')) {
          if (!isValidUrl(trimedLine)) {
            continue
          }

          yield {
            type: 'path',
            value: trimedLine,
            raw: trimedLine,
          }
          continue
        }

        const isStart = trimedLine.startsWith('^')
        const isEnd = trimedLine.endsWith('$')
        if (isStart || isEnd) {
          const type = isStart && isEnd ? 'full_match' : isStart ? 'start_with' : 'end_with'
          const value = trimedLine.replace(/^[\^]+|[\$]+$/g, '')
          yield { type, value, raw: trimedLine }
          continue
        }

        const domainMatch = trimedLine.match(DOMAIN_REGEX)
        if (domainMatch) {
          yield {
            type: 'domain',
            value: cleanDomain(domainMatch[1]),
            raw: trimedLine,
          }
        }
      }
    })()
  )

  const ruels = Array.from(ruleSet)
  if (sortComparator) {
    return ruels.sort(ruleComparator)
  }

  return ruels
}

function cleanDomain(domain: string): string {
  return domain.replace(/^\.+|\.+$/g, '').toLowerCase()
}

function parseRuleValue(value: string): string {
  if (value.startsWith('||')) {
    return cleanDomain(value.slice(2))
  }

  if (value.startsWith('|')) {
    return new URL(value.slice(1)).hostname
  }

  if (value.startsWith('/')) {
    return value.slice(1, -1)
  }

  return cleanDomain(value)
}

function ruleComparator(a: GFWRule, b: GFWRule) {
  const typeOrder: Record<RuleType, number> = {
    comment: 0,
    whitelist: 1,
    domain: 2,
    wildcard: 3,
    exact_url: 4,
    path: 5,
    regex: 6,
    start_with: 7,
    end_with: 8,
    full_match: 9,
    domain_keyword: 10,
  }

  return typeOrder[a.type] - typeOrder[b.type] || a.value.localeCompare(b.value)
}
