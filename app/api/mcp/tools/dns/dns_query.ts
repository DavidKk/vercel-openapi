import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { resolveDns } from '@/services/dns'

/**
 * MCP tool: query DNS for a domain (A and AAAA records).
 * Uses DoH; optional dns server (default 1.1.1.1).
 */
export const dns_query = tool(
  'dns_query',
  'Query DNS for a domain. Returns A and AAAA records in one response. Optional dns server (IP or DoH host; default 1.1.1.1).',
  z.object({
    domain: z.string().min(1).describe('Domain name to resolve (e.g. example.com)'),
    dns: z.string().optional().describe('DNS server (e.g. 1.1.1.1 or dns.google); optional, default 1.1.1.1'),
  }),
  async (params) => {
    const { domain, dns } = params as { domain: string; dns?: string }
    const result = await resolveDns(domain, dns)
    return result
  }
)
