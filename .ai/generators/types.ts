/**
 * Internal types for the module generator.
 * Schema shape: .ai/schemas/README.md. Rules shape: .ai/rules/module-layout.yaml
 */

export type SidebarItemKey = 'overview' | 'api' | 'mcp' | 'functionCalling' | 'skill'

export interface LayoutRuleItem {
  key: string
  defaultTitle: string
  pathSuffix: string
  iconName: string
}

export interface LayoutRules {
  sidebarItemsInOrder: LayoutRuleItem[]
  outerWrapperClassName: string
  innerWrapperClassName: string
  mainContentClassName: string
}

export interface RestEndpointSchema {
  method: 'GET' | 'POST'
  path: string
  description: string
  exampleResponse?: string
}

export interface McpToolSchema {
  name: string
  description: string
  paramsDescription?: string
}

export interface ApiPageSchema {
  title: string
  subtitle: string
  endpoints: RestEndpointSchema[]
  playgroundComponentName: string
  playgroundImportPath: string
}

export interface McpPageSchema {
  title: string
  subtitle: string
  tools: McpToolSchema[]
  playgroundComponentName: string
  playgroundImportPath: string
}

export interface SidebarItemSchema {
  key: SidebarItemKey
  title?: string
  ariaLabel?: string
  iconName?: string
}

export interface ModuleSchema {
  id: string
  name: string
  routePrefix: string
  sidebarItems?: SidebarItemSchema[]
  apiPage: ApiPageSchema
  mcpPage: McpPageSchema
}
