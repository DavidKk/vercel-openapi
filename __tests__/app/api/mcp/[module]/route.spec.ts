import { NextRequest } from 'next/server'

import { GET, POST } from '@/app/api/mcp/[module]/route'
import { mcpServiceNameForModule, moduleSkillMarkdownFilename, moduleSkillResourceUri } from '@/app/api/mcp/skillNaming'

jest.mock('@/app/actions/holiday', () => ({
  getTodaySpecial: jest.fn().mockResolvedValue('星期一'),
  isHolidayToady: jest.fn().mockResolvedValue(false),
  listHoliday: jest.fn().mockResolvedValue([]),
  isWorkday: jest.fn().mockResolvedValue(true),
  isHoliday: jest.fn().mockResolvedValue(false),
}))

describe('MCP API /api/mcp/[module]', () => {
  const contextFor = (module: string) => ({ params: Promise.resolve({ module }) })

  describe('GET /api/mcp/holiday', () => {
    it('should return 200 and manifest with only holiday tools', async () => {
      const req = new NextRequest('http://localhost/api/mcp/holiday', { method: 'GET' })
      const res = await GET(req, contextFor('holiday'))

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.type).toBe('result')
      expect(data.result.name).toBe(mcpServiceNameForModule('holiday'))
      expect(Array.isArray(data.result.resources)).toBe(true)
      expect(data.result.resources?.[0]?.name).toBe(moduleSkillMarkdownFilename('holiday'))
      expect(data.result.resources?.[0]?.uri).toBe(moduleSkillResourceUri('holiday'))
      expect(data.result.tools.get_today_holiday).toBeDefined()
      expect(data.result.tools.list_holiday).toBeDefined()
      expect(data.result.tools.get_exchange_rate).toBeUndefined()
    })
  })

  describe('POST /api/mcp/holiday', () => {
    it('should execute get_today_holiday and return result', async () => {
      const req = new NextRequest('http://localhost/api/mcp/holiday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'get_today_holiday', params: {} }),
      })
      const res = await POST(req, contextFor('holiday'))

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.type).toBe('result')
      expect(data.result.name).toBe('星期一')
    })

    it('should return TOOL_NOT_FOUND when calling tool from another module', async () => {
      const req = new NextRequest('http://localhost/api/mcp/holiday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'get_exchange_rate', params: { base: 'USD' } }),
      })
      const res = await POST(req, contextFor('holiday'))

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.type).toBe('error')
      expect(data.error.code).toBe('TOOL_NOT_FOUND')
    })
  })

  describe('GET /api/mcp/prices', () => {
    it('should include MCP resources for public SKILL in manifest', async () => {
      const req = new NextRequest('http://localhost/api/mcp/prices', { method: 'GET' })
      const res = await GET(req, contextFor('prices'))

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.type).toBe('result')
      expect(Array.isArray(data.result.resources)).toBe(true)
      expect(data.result.resources.length).toBeGreaterThanOrEqual(1)
      expect(data.result.resources[0].uri).toBe(moduleSkillResourceUri('prices'))
      expect(data.result.resources[0].name).toBe(moduleSkillMarkdownFilename('prices'))
      expect(data.result.resources[0].mimeType).toBe('text/markdown')
      expect(data.result.name).toBe(mcpServiceNameForModule('prices'))
    })
  })

  describe('POST /api/mcp/prices JSON-RPC resources', () => {
    it('should list resources', async () => {
      const req = new NextRequest('http://localhost/api/mcp/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'resources/list', params: {} }),
      })
      const res = await POST(req, contextFor('prices'))

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.jsonrpc).toBe('2.0')
      expect(data.result.resources).toBeDefined()
      expect(data.result.resources[0].name).toBe(moduleSkillMarkdownFilename('prices'))
    })

    it('should read resource markdown', async () => {
      const uri = moduleSkillResourceUri('prices')
      const req = new NextRequest('http://localhost/api/mcp/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'resources/read', params: { uri } }),
      })
      const res = await POST(req, contextFor('prices'))

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.result.contents).toBeDefined()
      expect(data.result.contents[0].mimeType).toBe('text/markdown')
      expect(data.result.contents[0].text).toContain('Prices API')
    })
  })

  describe('GET /api/mcp/unknown-module', () => {
    it('should return 404 for unknown module', async () => {
      const req = new NextRequest('http://localhost/api/mcp/unknown-module', { method: 'GET' })
      const res = await GET(req, contextFor('unknown-module'))

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.type).toBe('error')
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('unknown-module')
    })
  })

  describe('POST /api/mcp/unknown-module', () => {
    it('should return 404 for unknown module', async () => {
      const req = new NextRequest('http://localhost/api/mcp/unknown-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'get_today_holiday', params: {} }),
      })
      const res = await POST(req, contextFor('unknown-module'))

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error.code).toBe('NOT_FOUND')
    })
  })
})
