import { NextRequest } from 'next/server'

import { GET, POST } from '@/app/api/mcp/[module]/route'

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
      expect(data.result.name).toBe('unbnd')
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
