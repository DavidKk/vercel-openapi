import {
  buildClaudeCodeMcpAddCommand,
  buildCodexMcpTomlBlock,
  buildCursorMcpInstallDeepLink,
  buildCursorMcpJson,
  buildHermesMcpYamlFragment,
  buildOpenCodeMcpJsonFragment,
  buildVsCodeMcpInstallDeepLink,
  MCP_INSTALL_SERVER_KEY,
  resolveMcpInstallServerKey,
} from '@/app/api/mcp/installSnippets'

describe('app/api/mcp/installSnippets', () => {
  const url = 'https://example.com/api/mcp?includes=holiday'

  it('buildCursorMcpJson embeds url under mcpServers', () => {
    const parsed = JSON.parse(buildCursorMcpJson(url))
    expect(parsed.mcpServers[MCP_INSTALL_SERVER_KEY].url).toBe(url)
  })

  it('buildCursorMcpJson uses custom server key for module installs', () => {
    const moduleUrl = 'https://example.com/api/mcp/prices'
    const parsed = JSON.parse(buildCursorMcpJson(moduleUrl, 'unbnd-prices'))
    expect(parsed.mcpServers['unbnd-prices'].url).toBe(moduleUrl)
    expect(parsed.mcpServers.unbnd).toBeUndefined()
  })

  it('resolveMcpInstallServerKey is unbnd for aggregate and unbnd-module for per-module', () => {
    expect(resolveMcpInstallServerKey('/api/mcp')).toBe('unbnd')
    expect(resolveMcpInstallServerKey('/api/mcp?includes=prices')).toBe('unbnd')
    expect(resolveMcpInstallServerKey('/api/mcp/prices')).toBe('unbnd-prices')
    expect(resolveMcpInstallServerKey('https://host/api/mcp/dns')).toBe('unbnd-dns')
  })

  it('buildCursorMcpInstallDeepLink embeds base64 config Cursor can decode', () => {
    const link = buildCursorMcpInstallDeepLink(url)
    expect(link.startsWith('cursor://anysphere.cursor-deeplink/mcp/install?')).toBe(true)
    const qs = link.split('?')[1] ?? ''
    const params = new URLSearchParams(qs)
    expect(params.get('name')).toBe(MCP_INSTALL_SERVER_KEY)
    const configEnc = params.get('config')
    expect(configEnc).toBeTruthy()
    const decoded = JSON.parse(Buffer.from(decodeURIComponent(configEnc!), 'base64').toString('utf8')) as { url: string }
    expect(decoded.url).toBe(url)
  })

  it('buildCursorMcpInstallDeepLink uses name=unbnd-prices for prices module', () => {
    const moduleUrl = 'http://localhost:3000/api/mcp/prices'
    const link = buildCursorMcpInstallDeepLink(moduleUrl, 'unbnd-prices')
    const params = new URLSearchParams(link.split('?')[1] ?? '')
    expect(params.get('name')).toBe('unbnd-prices')
  })

  it('buildVsCodeMcpInstallDeepLink encodes http server JSON for vscode and insiders', () => {
    const stable = buildVsCodeMcpInstallDeepLink(url, MCP_INSTALL_SERVER_KEY, 'stable')
    expect(stable.startsWith('vscode:mcp/install?')).toBe(true)
    const qStable = stable.slice('vscode:mcp/install?'.length)
    const objStable = JSON.parse(decodeURIComponent(qStable)) as { name: string; type: string; url: string; headers: object }
    expect(objStable).toEqual({ name: MCP_INSTALL_SERVER_KEY, type: 'http', url, headers: {} })

    const ins = buildVsCodeMcpInstallDeepLink(url, 'unbnd-prices', 'insiders')
    expect(ins.startsWith('vscode-insiders:mcp/install?')).toBe(true)
    const qIns = ins.slice('vscode-insiders:mcp/install?'.length)
    const objIns = JSON.parse(decodeURIComponent(qIns)) as { name: string }
    expect(objIns.name).toBe('unbnd-prices')
  })

  it('buildClaudeCodeMcpAddCommand contains transport and url', () => {
    const cmd = buildClaudeCodeMcpAddCommand(url)
    expect(cmd).toContain('claude mcp add --transport http')
    expect(cmd).toContain(MCP_INSTALL_SERVER_KEY)
    expect(cmd).toContain('https://example.com')
  })

  it('buildCodexMcpTomlBlock uses mcp_servers table', () => {
    expect(buildCodexMcpTomlBlock(url)).toContain(`[mcp_servers."${MCP_INSTALL_SERVER_KEY}"]`)
    expect(buildCodexMcpTomlBlock(url)).toContain(`url = "${url}"`)
  })

  it('buildOpenCodeMcpJsonFragment marks remote type', () => {
    const parsed = JSON.parse(buildOpenCodeMcpJsonFragment(url))
    expect(parsed.mcp[MCP_INSTALL_SERVER_KEY].type).toBe('remote')
    expect(parsed.mcp[MCP_INSTALL_SERVER_KEY].url).toBe(url)
  })

  it('buildHermesMcpYamlFragment includes url line', () => {
    expect(buildHermesMcpYamlFragment(url)).toContain('mcp_servers:')
    expect(buildHermesMcpYamlFragment(url)).toContain(`url: "${url}"`)
  })
})
