import { NextRequest } from 'next/server'

import { GET } from '@/app/api/news/sources/route'

const mockGetAuthSession = jest.fn()
jest.mock('@/services/auth/session', () => ({
  getAuthSession: () => mockGetAuthSession(),
}))

describe('GET /api/news/sources', () => {
  beforeEach(() => {
    mockGetAuthSession.mockResolvedValue({ authenticated: true, username: 'test' })
  })

  it('should return 200 with sources array and baseUrl', async () => {
    const req = new NextRequest('http://localhost/api/news/sources', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.code).toBe(0)
    expect(Array.isArray(body.data?.sources)).toBe(true)
    expect(typeof body.data?.baseUrl).toBe('string')
    expect(body.data.baseUrl.length).toBeGreaterThan(0)
  })

  it('should return 400 for invalid category', async () => {
    const req = new NextRequest('http://localhost/api/news/sources?category=not-a-category', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).not.toBe(0)
    expect(String(body.message)).toMatch(/invalid category/i)
  })

  it('should return 400 for invalid region', async () => {
    const req = new NextRequest('http://localhost/api/news/sources?region=us', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(String(body.message)).toMatch(/invalid region/i)
  })

  it('should filter by valid category', async () => {
    const req = new NextRequest('http://localhost/api/news/sources?category=general-news', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(200)
    const body = await res.json()
    for (const s of body.data.sources as { category: string }[]) {
      expect(s.category).toBe('general-news')
    }
  })

  it('should filter by region intl', async () => {
    const req = new NextRequest('http://localhost/api/news/sources?region=intl', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })

    expect(res.status).toBe(200)
    const body = await res.json()
    const rows = body.data.sources as { region: string }[]
    expect(rows.length).toBeGreaterThan(0)
    for (const s of rows) {
      expect(s.region).toBe('intl')
    }
  })

  it('should return 403 when unauthenticated and region is intl', async () => {
    mockGetAuthSession.mockResolvedValueOnce({ authenticated: false, username: null })
    const req = new NextRequest('http://localhost/api/news/sources?region=intl', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(String(body.message)).toMatch(/sign-in/i)
  })
})
