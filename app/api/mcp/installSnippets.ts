/** MCP server key for the aggregate endpoint `/api/mcp` (with or without `?includes=`). */
export const MCP_INSTALL_SERVER_KEY = 'unbnd'

/**
 * MCP client server name: aggregate `/api/mcp` → `unbnd`; per-module `/api/mcp/{module}` → `unbnd-{module}`
 * (same pattern as JSON-RPC `serverInfo.name` on `/api/mcp/[module]`).
 */
export function resolveMcpInstallServerKey(endpointPathOrFullUrl: string): string {
  let pathWithQuery = endpointPathOrFullUrl.trim()
  if (pathWithQuery.startsWith('http://') || pathWithQuery.startsWith('https://')) {
    try {
      const u = new URL(pathWithQuery)
      pathWithQuery = `${u.pathname}${u.search}`
    } catch {
      return MCP_INSTALL_SERVER_KEY
    }
  }
  const pathOnly = pathWithQuery.split('?')[0] ?? pathWithQuery
  if (pathOnly === '/api/mcp') return MCP_INSTALL_SERVER_KEY
  const m = pathOnly.match(/^\/api\/mcp\/([^/]+)\/?$/)
  if (m?.[1]) return `unbnd-${m[1]}`
  return MCP_INSTALL_SERVER_KEY
}

function escapeForSingleQuotedShell(s: string): string {
  return `'${s.replace(/'/g, `'\"'\"'`)}'`
}

/** Cursor / VS Code–style `mcp.json` fragment: merge `mcpServers` into `.cursor/mcp.json` (or project MCP settings). */
export function buildCursorMcpJson(mcpHttpUrl: string, serverKey: string = MCP_INSTALL_SERVER_KEY): string {
  return JSON.stringify({ mcpServers: { [serverKey]: { url: mcpHttpUrl } } }, null, 2)
}

/**
 * Cursor desktop one-click MCP install (opens Cursor, no manual paste).
 * `name` is the `mcpServers` key; `config` must be only the server entry (e.g. `{ "url": "..." }`), not wrapped again
 * under the server name — otherwise Cursor merges to `mcpServers[name].<name>.url`.
 * @see https://cursor.com/docs/context/mcp/install-links
 */
export function buildCursorMcpInstallDeepLink(mcpHttpUrl: string, serverKey: string = MCP_INSTALL_SERVER_KEY): string {
  const payload = { url: mcpHttpUrl }
  const json = JSON.stringify(payload)
  const base64 = utf8JsonToBase64(json)
  const config = encodeURIComponent(base64)
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(serverKey)}&config=${config}`
}

export type VsCodeMcpInstallChannel = 'stable' | 'insiders'

/**
 * VS Code / VS Code Insiders one-click install for a streamable HTTP MCP server.
 * @see https://code.visualstudio.com/api/extension-guides/ai/mcp#create-an-mcp-installation-url
 */
export function buildVsCodeMcpInstallDeepLink(mcpHttpUrl: string, serverKey: string = MCP_INSTALL_SERVER_KEY, channel: VsCodeMcpInstallChannel = 'stable'): string {
  const payload = {
    name: serverKey,
    type: 'http',
    url: mcpHttpUrl,
    headers: {} as Record<string, string>,
  }
  const scheme = channel === 'insiders' ? 'vscode-insiders' : 'vscode'
  return `${scheme}:mcp/install?${encodeURIComponent(JSON.stringify(payload))}`
}

function utf8JsonToBase64(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

/** Claude Code CLI (HTTP transport). */
export function buildClaudeCodeMcpAddCommand(mcpHttpUrl: string, serverKey: string = MCP_INSTALL_SERVER_KEY): string {
  return `claude mcp add --transport http ${serverKey} ${escapeForSingleQuotedShell(mcpHttpUrl)}`
}

/** OpenAI Codex: append under `~/.codex/config.toml` (or project `.codex/config.toml`). Streamable HTTP. */
export function buildCodexMcpTomlBlock(mcpHttpUrl: string, serverKey: string = MCP_INSTALL_SERVER_KEY): string {
  return `[mcp_servers."${serverKey}"]
url = ${JSON.stringify(mcpHttpUrl)}
enabled = true
`
}

/**
 * OpenCode remote MCP (`opencode.json` / `~/.config/opencode/opencode.json`).
 * @see https://opencode.ai/docs/mcp-servers/
 */
export function buildOpenCodeMcpJsonFragment(mcpHttpUrl: string, serverKey: string = MCP_INSTALL_SERVER_KEY): string {
  return JSON.stringify(
    {
      mcp: {
        [serverKey]: {
          type: 'remote',
          url: mcpHttpUrl,
          enabled: true,
        },
      },
    },
    null,
    2
  )
}

/**
 * Hermes Agent (Nous Research) YAML `mcp_servers` block.
 * @see https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
 */
export function buildHermesMcpYamlFragment(mcpHttpUrl: string, serverKey: string = MCP_INSTALL_SERVER_KEY): string {
  return `mcp_servers:
  ${serverKey}:
    url: ${JSON.stringify(mcpHttpUrl)}
`
}
