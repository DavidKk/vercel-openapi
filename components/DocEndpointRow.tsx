import { DOC_ENDPOINT_PATH_CLASS } from '@/app/Nav/constants'
import { MethodBadge } from '@/components/MethodBadge'

export interface DocEndpointRowProps {
  /** HTTP method (GET, POST, PUT, etc.); color varies by method */
  method: string
  /** Path (e.g. "/api/holiday", "/api/mcp") */
  path: string
}

/**
 * One row for doc panel: method badge (color by type) + path.
 */
export function DocEndpointRow(props: DocEndpointRowProps) {
  const { method, path } = props
  return (
    <div className="flex items-center gap-2">
      <MethodBadge method={method} />
      <code className={DOC_ENDPOINT_PATH_CLASS}>{path}</code>
    </div>
  )
}
