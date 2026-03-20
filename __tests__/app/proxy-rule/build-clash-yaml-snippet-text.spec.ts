import { buildClashYamlSnippetText } from '@/app/proxy-rule/build-clash-yaml-snippet-text'

describe('buildClashYamlSnippetText', () => {
  it('should include dns block by default', () => {
    const yaml = buildClashYamlSnippetText({
      baseUrl: 'https://example.com',
      secret: 's',
      actions: ['Proxy'],
    })

    expect(yaml).toContain('dns:')
    expect(yaml).toContain('tun:')
    expect(yaml).toContain('proxies:')
  })

  it('should omit dns block when includeDns is false', () => {
    const yaml = buildClashYamlSnippetText({
      baseUrl: 'https://example.com',
      secret: 's',
      actions: ['Proxy'],
      includeDns: false,
      includeTun: true,
    })

    expect(yaml).not.toContain('dns:')
    expect(yaml).toContain('tun:')
    expect(yaml).toContain('proxies:')
  })

  it('should omit tun block when includeTun is false', () => {
    const yaml = buildClashYamlSnippetText({
      baseUrl: 'https://example.com',
      secret: 's',
      actions: ['Proxy'],
      includeDns: true,
      includeTun: false,
    })

    expect(yaml).toContain('dns:')
    expect(yaml).not.toContain('tun:')
    expect(yaml).toContain('proxies:')
  })

  it('should omit dns and tun blocks when both are false', () => {
    const yaml = buildClashYamlSnippetText({
      baseUrl: 'https://example.com',
      secret: 's',
      actions: ['Proxy'],
      includeDns: false,
      includeTun: false,
    })

    expect(yaml).not.toContain('dns:')
    expect(yaml).not.toContain('tun:')
    expect(yaml).toContain('proxies:')
  })
})
