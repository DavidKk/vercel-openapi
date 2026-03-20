import JSZip from 'jszip'
import { NextRequest } from 'next/server'

import { GET as GETZip } from '@/app/api/skills/[name]/route'

describe('Skills bundle ZIP API /api/skills/[name]', () => {
  it('should create a ZIP with stripped skill markdown and index.json metadata', async () => {
    const req = new NextRequest('http://localhost/api/skills/geo', { method: 'GET' })
    const context = { params: Promise.resolve({ name: 'geo' }) }
    const res = await GETZip(req, context)

    expect(res.status).toBe(200)
    const contentDisposition = res.headers.get('content-disposition')
    expect(contentDisposition).toContain('unbnd-geo.zip')

    const ab = await res.arrayBuffer()
    const zip = await JSZip.loadAsync(ab)

    const skillPath = 'geo-api-skill.md'
    const indexPath = 'index.json'

    const skillEntry = zip.file(skillPath)
    expect(skillEntry).toBeDefined()
    const skillText = (await skillEntry!.async('string')).trimStart()
    expect(skillText.startsWith('---')).toBe(false)
    expect(skillText.startsWith('# ')).toBe(true)

    const indexEntry = zip.file(indexPath)
    expect(indexEntry).toBeDefined()
    const indexText = await indexEntry!.async('string')
    const idx = JSON.parse(indexText) as {
      version: string
      files: { path: string; name?: string; description?: string }[]
    }

    expect(typeof idx.version).toBe('string')
    expect(idx.version.length).toBeGreaterThan(0)
    expect(Array.isArray(idx.files)).toBe(true)
    expect(idx.files.some((f) => f.path === skillPath)).toBe(true)

    const geoFile = idx.files.find((f) => f.path === skillPath)
    expect(typeof geoFile?.description).toBe('string')
    expect((geoFile?.description ?? '').length).toBeGreaterThan(0)
  })

  it('should filter includes=geo inside bundle all', async () => {
    const req = new NextRequest('http://localhost/api/skills/all?includes=geo', { method: 'GET' })
    const context = { params: Promise.resolve({ name: 'all' }) }
    const res = await GETZip(req, context)

    expect(res.status).toBe(200)
    const contentDisposition = res.headers.get('content-disposition')
    expect(contentDisposition).toContain('unbnd-all.zip')

    const ab = await res.arrayBuffer()
    const zip = await JSZip.loadAsync(ab)

    const indexEntry = zip.file('index.json')
    expect(indexEntry).toBeDefined()
    const indexText = await indexEntry!.async('string')
    const idx = JSON.parse(indexText) as { files: { path: string }[] }

    expect(idx.files.length).toBe(1)
    expect(idx.files[0].path).toContain('geo-api-skill.md')
  })

  it('should include metadata for prices and proxy-rule inside bundle all', async () => {
    const req = new NextRequest('http://localhost/api/skills/all', { method: 'GET' })
    const context = { params: Promise.resolve({ name: 'all' }) }
    const res = await GETZip(req, context)

    expect(res.status).toBe(200)
    const ab = await res.arrayBuffer()
    const zip = await JSZip.loadAsync(ab)

    const indexEntry = zip.file('index.json')
    expect(indexEntry).toBeDefined()
    const indexText = await indexEntry!.async('string')
    const idx = JSON.parse(indexText) as {
      files: { path: string; name?: string; description?: string }[]
    }

    const pricesFile = idx.files.find((f) => f.path === 'prices-api-skill.md')
    expect(pricesFile).toBeDefined()
    expect(pricesFile?.name).toBe('prices')

    const proxyFile = idx.files.find((f) => f.path === 'proxy-rule-api-skill.md')
    expect(proxyFile).toBeDefined()
    expect(proxyFile?.name).toBe('proxy-rule')
  })
})
