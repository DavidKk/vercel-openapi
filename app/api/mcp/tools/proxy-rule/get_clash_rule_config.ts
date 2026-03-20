import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { buildMergedClashRulePayload } from '@/services/proxy-rule/merge-payload'

/**
 * MCP tool: merged Clash RULE-SET payload lines for a given action (same as GET /api/proxy-rule/clash/config).
 */
export const get_clash_rule_config = tool(
  'get_clash_rule_config',
  'Returns merged Clash rule-set line prefixes for rules matching the given action (e.g. Proxy, DIRECT, REJECT). Combines gist rules, optional ZeroOmega gist, and gfwlist.',
  z.object({
    type: z.string().min(1).describe('Clash rule action to filter by, e.g. Proxy'),
  }),
  async (params) => {
    const { type } = params as { type: string }
    const payload = await buildMergedClashRulePayload(type)
    return { payload, payloadText: payload.join('\n') }
  }
)
