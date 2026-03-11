import { NextRequest } from 'next/server'

import { GET, POST } from '@/app/api/mcp/route'

jest.mock('@/app/actions/holiday', () => ({
  getTodaySpecial: jest.fn().mockResolvedValue('星期一'),
  isHolidayToady: jest.fn().mockResolvedValue(false),
  listHoliday: jest.fn().mockResolvedValue([]),
  isWorkday: jest.fn().mockResolvedValue(true),
  isHoliday: jest.fn().mockResolvedValue(false),
}))

describe('MCP API /api/mcp', () => {
  const baseUrl = 'http://localhost/api/mcp'
  const context = { params: Promise.resolve({}) }

  describe('GET (manifest)', () => {
    it('should return 200 and manifest with name, version and tools', async () => {
      const req = new NextRequest(baseUrl, { method: 'GET' })
      const res = await GET(req, context)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.type).toBe('result')
      expect(data.result).toBeDefined()
      expect(data.result.name).toBe('vercel-openapi')
      expect(data.result.version).toBeDefined()
      expect(data.result.description).toBeDefined()
      expect(typeof data.result.tools).toBe('object')
      expect(data.result.tools.get_exchange_rate).toBeDefined()
      expect(data.result.tools.convert_currency).toBeDefined()
      expect(data.result.tools.get_today_holiday).toBeDefined()
    })
  })

  describe('POST (execute)', () => {
    it('should return 200 and result when tool exists and params are valid', async () => {
      const req = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'get_today_holiday', params: {} }),
      })
      const res = await POST(req, context)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.type).toBe('result')
      expect(data.result).toBeDefined()
      expect(data.result.isHoliday).toBe(false)
      expect(data.result.name).toBe('星期一')
    })

    it('should return error when tool name is missing', async () => {
      const req = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: {} }),
      })
      const res = await POST(req, context)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.type).toBe('error')
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INVALID_ARGUMENT')
    })

    it('should return error when tool is not found', async () => {
      const req = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'unknown_tool', params: {} }),
      })
      const res = await POST(req, context)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.type).toBe('error')
      expect(data.error.code).toBe('TOOL_NOT_FOUND')
    })

    it('should return error when Content-Type is not application/json', async () => {
      const req = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ tool: 'get_today_holiday', params: {} }),
      })
      const res = await POST(req, context)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.type).toBe('error')
      expect(data.error.code).toBe('INVALID_ARGUMENT')
    })
  })

  describe('POST (JSON-RPC 2.0)', () => {
    it('should return tools list for method tools/list', async () => {
      const req = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }),
      })
      const res = await POST(req, context)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.jsonrpc).toBe('2.0')
      expect(data.id).toBe(1)
      expect(data.result).toBeDefined()
      expect(Array.isArray(data.result.tools)).toBe(true)
      expect(data.result.tools.some((t: { name: string }) => t.name === 'get_today_holiday')).toBe(true)
    })

    it('should execute tool for method tools/call and return content + isError', async () => {
      const req = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'get_today_holiday', arguments: {} },
        }),
      })
      const res = await POST(req, context)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.jsonrpc).toBe('2.0')
      expect(data.id).toBe(2)
      expect(data.result).toBeDefined()
      expect(data.result.content).toBeDefined()
      expect(data.result.content[0].type).toBe('text')
      expect(data.result.isError).toBe(false)
      const parsed = JSON.parse(data.result.content[0].text)
      expect(parsed.isHoliday).toBe(false)
      expect(parsed.name).toBe('星期一')
    })

    it('should return JSON-RPC error for unknown method', async () => {
      const req = new NextRequest(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'unknown/method',
          params: {},
        }),
      })
      const res = await POST(req, context)

      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.jsonrpc).toBe('2.0')
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe(-32601)
      expect(data.error.message).toContain('Method not found')
    })
  })
})
