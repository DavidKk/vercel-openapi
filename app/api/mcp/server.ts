import { createMCPHttpServer } from '@/initializer/mcp'

import { getMCPTools } from './tools'

/** MCP service name */
const MCP_NAME = 'unbnd'
/** MCP service version (aligned with package.json) */
const MCP_VERSION = '0.1.0'
/** MCP service description for manifest */
const MCP_DESCRIPTION = 'A private OpenAPI service for personal use.'

const { manifest, execute } = createMCPHttpServer(MCP_NAME, MCP_VERSION, MCP_DESCRIPTION, getMCPTools())

export { execute, manifest }
