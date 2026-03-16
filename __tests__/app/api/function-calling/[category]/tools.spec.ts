import { GET } from '@/app/api/function-calling/[category]/tools/route'

describe('Function Calling API /api/function-calling/[category]/tools', () => {
  it('should return 200 and only holiday tools for category holiday', async () => {
    const res = await GET(new Request('http://localhost/'), { params: Promise.resolve({ category: 'holiday' }) })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.tools).toBeDefined()
    expect(Array.isArray(data.tools)).toBe(true)
    const names = data.tools.map((t: { function: { name: string } }) => t.function.name)
    expect(names).toContain('get_today_holiday')
    expect(names).toContain('list_holiday')
    expect(names).toContain('is_workday')
    expect(names).toContain('is_holiday')
    expect(names.length).toBe(4)
  })

  it('should return 200 and only exchange-rate tools for category exchange-rate', async () => {
    const res = await GET(new Request('http://localhost/'), { params: Promise.resolve({ category: 'exchange-rate' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    const names = data.tools.map((t: { function: { name: string } }) => t.function.name)
    expect(names).toContain('get_exchange_rate')
    expect(names).toContain('convert_currency')
    expect(names.length).toBe(2)
  })

  it('should return 200 and only fuel-price tools for category fuel-price', async () => {
    const res = await GET(new Request('http://localhost/'), { params: Promise.resolve({ category: 'fuel-price' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    const names = data.tools.map((t: { function: { name: string } }) => t.function.name)
    expect(names).toContain('get_fuel_price')
    expect(names).toContain('get_fuel_price_by_province')
    expect(names).toContain('get_next_fuel_price_adjustment')
    expect(names).toContain('calc_fuel_recharge_promo')
    expect(names.length).toBe(4)
  })

  it('should return 404 for unknown category', async () => {
    const res = await GET(new Request('http://localhost/'), { params: Promise.resolve({ category: 'unknown' }) })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(data.allowed).toEqual(['dns', 'holiday', 'fuel-price', 'exchange-rate', 'movies', 'weather', 'finance'])
  })
})
