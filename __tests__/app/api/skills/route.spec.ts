import { NextRequest } from 'next/server'

import { moduleSkillMarkdownFilename } from '@/app/api/mcp/skillNaming'
import { GET } from '@/app/api/skills/route'
import packageJson from '@/package.json'

describe('Skills index API /api/skills', () => {
  it('should return bundles with file metadata', async () => {
    const req = new NextRequest('http://localhost/api/skills', { method: 'GET' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.version).toBe(packageJson.version)
    expect(Array.isArray(data.bundles)).toBe(true)
    expect(data.bundles.length).toBeGreaterThan(0)

    const geo = data.bundles.find((b: { name: string }) => b.name === 'geo')
    expect(geo).toBeDefined()

    expect(Array.isArray((geo as any).files)).toBe(true)
    const geoFile = (geo as any).files.find((f: any) => f.path === moduleSkillMarkdownFilename('geo'))
    expect(geoFile).toBeDefined()
    expect(geoFile.name).toBe('geo')
    expect(typeof geoFile.description).toBe('string')
    expect(geoFile.description.length).toBeGreaterThan(0)
  })
})
