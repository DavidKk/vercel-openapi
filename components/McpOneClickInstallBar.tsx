'use client'

import { useEffect, useMemo, useState } from 'react'

import { inferClientPublicBaseUrl } from '@/app/api/mcp/inferClientPublicBaseUrl'
import { buildCursorMcpInstallDeepLink, buildVsCodeMcpInstallDeepLink, MCP_INSTALL_SERVER_KEY, resolveMcpInstallServerKey } from '@/app/api/mcp/installSnippets'

export type McpOneClickInstallBarProps = {
  /**
   * Full MCP URL (e.g. `https://host/api/mcp`). If omitted, `endpointPath` is resolved on the client with
   * {@link inferClientPublicBaseUrl}.
   */
  mcpHttpUrl?: string
  /** Path starting with `/api/mcp` (e.g. `/api/mcp`, `/api/mcp/dns`). Used when `mcpHttpUrl` is not passed. */
  endpointPath?: string
  className?: string
}

const DEEPLINK_BTN_CLASS = 'inline-flex items-center rounded border border-gray-900 bg-gray-900 px-2 py-1 text-[10px] font-medium text-white hover:bg-gray-800'

/**
 * One-click MCP install for editors that publish official install URLs (Cursor, VS Code, VS Code Insiders).
 */
export function McpOneClickInstallBar(props: McpOneClickInstallBarProps) {
  const { mcpHttpUrl: mcpHttpUrlProp, endpointPath, className = '' } = props
  const [resolvedUrl, setResolvedUrl] = useState(() => (mcpHttpUrlProp && mcpHttpUrlProp.startsWith('http') ? mcpHttpUrlProp : ''))

  useEffect(() => {
    if (mcpHttpUrlProp && mcpHttpUrlProp.startsWith('http')) {
      setResolvedUrl(mcpHttpUrlProp)
      return
    }
    if (endpointPath && endpointPath.startsWith('/api/mcp')) {
      setResolvedUrl(`${inferClientPublicBaseUrl()}${endpointPath}`)
    }
  }, [mcpHttpUrlProp, endpointPath])

  const serverKey = useMemo(() => {
    if (endpointPath) return resolveMcpInstallServerKey(endpointPath)
    if (mcpHttpUrlProp?.startsWith('http')) return resolveMcpInstallServerKey(mcpHttpUrlProp)
    if (resolvedUrl) return resolveMcpInstallServerKey(resolvedUrl)
    return MCP_INSTALL_SERVER_KEY
  }, [endpointPath, mcpHttpUrlProp, resolvedUrl])

  const ready = Boolean(resolvedUrl)

  return (
    <div className={`rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 ${className}`}>
      <p className="text-[11px] font-medium text-gray-800">One-click install</p>
      <p className="mt-0.5 text-[10px] leading-snug text-gray-600">
        <strong className="font-medium text-gray-700">Cursor</strong> and <strong className="font-medium text-gray-700">VS Code</strong> (stable / Insiders) expose documented
        install links; clicking opens the app to add this HTTP MCP. Other editors (Windsurf, Claude Code, Zed, …) still need manual config or their marketplace. Server name:{' '}
        <code className="rounded bg-gray-200 px-0.5 font-mono text-[10px]">{serverKey}</code> (
        <code className="rounded bg-gray-200 px-0.5 font-mono text-[10px]">{MCP_INSTALL_SERVER_KEY}</code> for{' '}
        <code className="rounded bg-gray-200 px-0.5 font-mono text-[10px]">/api/mcp</code>, <code className="rounded bg-gray-200 px-0.5 font-mono text-[10px]">unbnd-*</code> for
        module routes).
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {ready && (
          <>
            <a
              href={buildCursorMcpInstallDeepLink(resolvedUrl, serverKey)}
              className={DEEPLINK_BTN_CLASS}
              rel="noopener noreferrer"
              title="cursor://anysphere.cursor-deeplink/mcp/install"
            >
              Cursor
            </a>
            <a href={buildVsCodeMcpInstallDeepLink(resolvedUrl, serverKey, 'stable')} className={DEEPLINK_BTN_CLASS} rel="noopener noreferrer" title="vscode:mcp/install (stable)">
              VS Code
            </a>
            <a
              href={buildVsCodeMcpInstallDeepLink(resolvedUrl, serverKey, 'insiders')}
              className={DEEPLINK_BTN_CLASS}
              rel="noopener noreferrer"
              title="vscode-insiders:mcp/install"
            >
              Insiders
            </a>
          </>
        )}
      </div>
      {!ready && <p className="mt-1.5 text-[10px] text-amber-800">Resolving MCP URL for this page…</p>}
    </div>
  )
}
