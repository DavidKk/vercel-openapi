import { buildClashYamlSnippetText } from '@/app/proxy-rule/build-clash-yaml-snippet-text'
import { resolveTailscaleHostname } from '@/app/proxy-rule/tailscale-hostname'

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
    expect(yaml).toContain('type: tailscale')
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

  it('should include Tailscale proxy with device hostname by default', () => {
    const yaml = buildClashYamlSnippetText({
      baseUrl: 'https://example.com',
      secret: 's',
      actions: ['Proxy'],
      tailscaleHostname: 'iphone',
    })

    expect(yaml).toContain('name: Tailscale')
    expect(yaml).toContain('type: tailscale')
    expect(yaml).toContain('hostname: iphone')
    expect(yaml).toContain('      - Tailscale')
  })

  it('should omit Tailscale proxy when includeTailscale is false', () => {
    const yaml = buildClashYamlSnippetText({
      baseUrl: 'https://example.com',
      secret: 's',
      actions: ['Proxy'],
      includeTailscale: false,
    })

    expect(yaml).not.toContain('type: tailscale')
    expect(yaml).not.toContain('name: Tailscale')
  })
})

describe('resolveTailscaleHostname', () => {
  it('should map iPhone user agent to iphone', () => {
    expect(resolveTailscaleHostname('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('iphone')
  })

  it('should map Macintosh user agent to macbook', () => {
    expect(resolveTailscaleHostname('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15')).toBe('macbook')
  })

  it('should map Android user agent to android', () => {
    expect(resolveTailscaleHostname('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36')).toBe('android')
  })

  it('should fall back to device for unknown agents', () => {
    expect(resolveTailscaleHostname('curl/8.0')).toBe('device')
  })
})
