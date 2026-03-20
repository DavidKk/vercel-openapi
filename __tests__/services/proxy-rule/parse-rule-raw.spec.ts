import { parseRuleRaw } from '@/services/proxy-rule/clash/utils'

describe('parseRuleRaw', () => {
  it('should parse DOMAIN rule with value and action', () => {
    const rule = parseRuleRaw('DOMAIN,example.com,Proxy')
    expect(rule).toEqual({ type: 'DOMAIN', value: 'example.com', action: 'Proxy' })
  })

  it('should parse MATCH rule', () => {
    const rule = parseRuleRaw('MATCH,DIRECT')
    expect(rule).toEqual({ type: 'MATCH', action: 'DIRECT' })
  })

  it('should return undefined for unknown type', () => {
    expect(parseRuleRaw('UNKNOWN,a,b')).toBeUndefined()
  })
})
