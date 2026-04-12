import { parsePolygonRing } from '@/services/china-geo/parse-polygon-ring'

describe('parsePolygonRing', () => {
  it('should parse a single ring without semicolon', () => {
    const s = '113.1 22.96,113.11 22.96,113.11 22.97,113.1 22.97,113.1 22.96'
    const pts = parsePolygonRing(s)
    expect(pts.length).toBe(5)
    expect(pts[0]).toEqual([113.1, 22.96])
  })

  it('should use only the segment before the first semicolon', () => {
    const first = '100 20,101 20,101 21,100 21,100 20'
    const second = '200 30,201 30,201 31,200 31,200 30'
    const pts = parsePolygonRing(`${first};${second}`)
    expect(pts.length).toBe(5)
    expect(pts[0]).toEqual([100, 20])
    expect(pts.some(([lng]) => lng >= 200)).toBe(false)
  })

  it('should return empty array for empty or whitespace input', () => {
    expect(parsePolygonRing('')).toEqual([])
    expect(parsePolygonRing('   ')).toEqual([])
  })
})
