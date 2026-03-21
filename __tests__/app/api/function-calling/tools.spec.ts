import { NextRequest } from 'next/server'

import { GET } from '@/app/api/function-calling/tools/route'

const baseUrl = 'http://localhost/api/function-calling/tools'

describe('Function Calling API /api/function-calling/tools', () => {
  it('should return 200 and OpenAI-compatible tools array', async () => {
    const req = new NextRequest(baseUrl, { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.tools).toBeDefined()
    expect(Array.isArray(data.tools)).toBe(true)
    expect(data.tools.length).toBeGreaterThan(0)

    const first = data.tools[0]
    expect(first.type).toBe('function')
    expect(first.function).toBeDefined()
    expect(typeof first.function.name).toBe('string')
    expect(typeof first.function.description).toBe('string')
    expect(first.function.parameters).toBeDefined()
    expect(first.function.parameters.type).toBe('object')
  })

  it('should include MCP tool names such as get_today_holiday and convert_currency', async () => {
    const req = new NextRequest(baseUrl, { method: 'GET' })
    const res = await GET(req)
    const data = await res.json()
    const names = data.tools.map((t: { function: { name: string } }) => t.function.name)
    expect(names).toContain('get_today_holiday')
    expect(names).toContain('convert_currency')
    expect(names).toContain('list_news_sources')
    expect(names).toContain('get_news_feed')
  })
})
