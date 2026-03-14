import type { LayoutRules, ModuleSchema } from './types'

export interface GeneratedFile {
  filepath: string
  contents: string
}

/**
 * Generate module files from schema and layout rules.
 * Output paths are relative to project root (e.g. app/holiday/layout.tsx).
 *
 * @param schema Module schema (e.g. from loadSchema('.ai/schemas/holiday.yaml'))
 * @param layoutRules Layout rules (e.g. from loadRules())
 * @returns List of generated files
 */
export function createModuleFiles(schema: ModuleSchema, layoutRules: LayoutRules): GeneratedFile[] {
  const files: GeneratedFile[] = []

  files.push({
    filepath: `app/${schema.id}/layout.tsx`,
    contents: generateLayoutFile(schema, layoutRules),
  })
  files.push({
    filepath: `app/${schema.id}/page.tsx`,
    contents: generateOverviewPageFile(schema),
  })
  files.push({
    filepath: `app/${schema.id}/api/page.tsx`,
    contents: generateApiPageFile(schema),
  })
  files.push({
    filepath: `app/${schema.id}/mcp/page.tsx`,
    contents: generateMcpPageFile(schema),
  })

  return files
}

function generateLayoutFile(schema: ModuleSchema, layoutRules: LayoutRules): string {
  const sidebarConfigLines = layoutRules.sidebarItemsInOrder
    .map((rule) => {
      const override = schema.sidebarItems?.find((item) => item.key === rule.key)
      const title = override?.title ?? rule.defaultTitle
      const ariaLabel = override?.ariaLabel ?? title
      const iconName = override?.iconName ?? rule.iconName
      const href = `${schema.routePrefix}${rule.pathSuffix}`
      const iconJsx = getIconJsx(iconName)
      return `  { href: '${href}', title: '${escapeStr(title)}', ariaLabel: '${escapeStr(ariaLabel)}', icon: ${iconJsx} },`
    })
    .join('\n')

  const iconImports = collectIconImports(layoutRules, schema)
  const layoutName = pascalCase(schema.id)

  return `import { ${iconImports.join(', ')} } from 'react-icons/tb'

import { DashboardSidebar } from '@/components/DashboardSidebar'

interface ${layoutName}LayoutProps {
  children: React.ReactNode
}

const SIDEBAR_ITEMS = [
${sidebarConfigLines}
]

/**
 * ${schema.name} section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns ${schema.name} layout with sidebar and content area
 */
export default function ${layoutName}Layout(props: Readonly<${layoutName}LayoutProps>) {
  const { children } = props

  return (
    <div className="${layoutRules.outerWrapperClassName}">
      <div className="${layoutRules.innerWrapperClassName}">
        <DashboardSidebar items={SIDEBAR_ITEMS} />
        <main className="${layoutRules.mainContentClassName}">{children}</main>
      </div>
    </div>
  )
}
`
}

/**
 * Overview page is not generated from schema; content is module-specific.
 * Generator produces an empty placeholder. Ask the developer how Overview should be displayed;
 * if not specified, leave empty until they provide the design.
 */
function generateOverviewPageFile(schema: ModuleSchema): string {
  const pageName = pascalCase(schema.id)

  return `/**
 * ${schema.name} overview page. Content is not generated from schema.
 * Ask the developer how the Overview should be displayed; if not specified, leave empty.
 * Add the main view component here when the developer provides the design.
 */
export default function ${pageName}Page() {
  return (
    <section className="flex h-full flex-col">
      {/* Overview content: implement per developer spec or leave empty */}
    </section>
  )
}
`
}

function generateApiPageFile(schema: ModuleSchema): string {
  const { apiPage } = schema
  const endpointBlocks = apiPage.endpoints
    .map(
      (ep) =>
        `          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="${ep.method}" path="/api${ep.path}" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>${escapeStr(ep.description)}</p>
          </div>`
    )
    .join('\n\n')

  const firstWithExample = apiPage.endpoints.find((e) => e.exampleResponse)
  const exampleBlock = firstWithExample
    ? `
          <h2 className={\`\${DOC_SECTION_TITLE_CLASS} mt-3\`}>Response example</h2>
          <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {\`${escapeBacktick(firstWithExample.exampleResponse!.trim())}\`}
          </pre>`
    : ''

  const pageName = pascalCase(schema.id)
  return `import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { ${apiPage.playgroundComponentName} } from '${apiPage.playgroundImportPath}'

/**
 * ${schema.name} REST API page.
 * Left side shows documentation for REST endpoints, right side is an interactive playground.
 */
export default function ${pageName}ApiPage() {
  return (
    <div className="flex h-full">
      {/* Left: documentation */}
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col border-r border-gray-200 bg-white">
        <DocPanelHeader title="${escapeStr(apiPage.title)}" subtitle="${escapeStr(apiPage.subtitle)}" />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
${endpointBlocks}
${exampleBlock}
        </div>
      </section>

      {/* Right: playground */}
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col bg-gray-50">
        <div className="flex min-h-0 flex-1 flex-col">
          <${apiPage.playgroundComponentName} />
        </div>
      </section>
    </div>
  )
}
`
}

function generateMcpPageFile(schema: ModuleSchema): string {
  const { mcpPage } = schema
  const toolsList = mcpPage.tools
    .map((tool) => {
      const desc = tool.paramsDescription ? `${tool.description} Params: ${tool.paramsDescription}` : tool.description
      return `            <li className="mb-1">
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">${tool.name}</code> – ${escapeStr(desc)}
            </li>`
    })
    .join('\n')

  const pageName = pascalCase(schema.id)
  return `import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { ${mcpPage.playgroundComponentName} } from '${mcpPage.playgroundImportPath}'

/**
 * ${schema.name} MCP tools page.
 * Left side documents MCP tools, right side is a playground for POST /api/mcp.
 * @returns ${schema.name} MCP tools page
 */
export default function ${pageName}McpPage() {
  return (
    <div className="flex h-full">
      {/* Left: documentation */}
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col border-r border-gray-200 bg-white">
        <DocPanelHeader title="${escapeStr(mcpPage.title)}" subtitle="${escapeStr(mcpPage.subtitle)}" />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Call with <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ tool, params }'}</code> to execute a single tool.
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Available tools</h2>
          <ul className="mb-3 list-disc pl-4">
${toolsList}
          </ul>
        </div>
      </section>

      {/* Right: playground */}
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col bg-gray-50">
        <div className="flex min-h-0 flex-1 flex-col">
          <${mcpPage.playgroundComponentName} />
        </div>
      </section>
    </div>
  )
}
`
}

function pascalCase(value: string): string {
  return value
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function escapeBacktick(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

const ICON_NAMES = ['TbCalendarSearch', 'TbGasStation', 'TbCurrencyDollar', 'TbMapPin', 'TbApi', 'TbRobot', 'TbCode', 'TbFileText', 'TbMovie', 'TbWorld'] as const

function getIconJsx(iconName: string): string {
  const name = ICON_NAMES.includes(iconName as (typeof ICON_NAMES)[number]) ? iconName : 'TbFileText'
  return `<${name} className="h-5 w-5" />`
}

function collectIconImports(layoutRules: LayoutRules, schema: ModuleSchema): string[] {
  const fromRules = layoutRules.sidebarItemsInOrder.map((r) => r.iconName)
  const fromSchema = (schema.sidebarItems ?? []).map((s) => s.iconName).filter(Boolean) as string[]
  const set = new Set([...fromRules, ...fromSchema])
  return Array.from(set).sort()
}
