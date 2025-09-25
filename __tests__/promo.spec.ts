import { calcRechargePromo } from '../app/actions/fuel-price/promo'

describe('calcRechargePromo', () => {
  it('should calculate the correct promo values', () => {
    const result = calcRechargePromo(7.13, 1000, 300)

    expect(result.pay).toBe(1000)
    expect(result.bonus).toBe(300)
    expect(result.balance).toBe(1300)
    expect(result.liters).toBeCloseTo(182.33, 2)
    expect(result.effectivePrice).toBeCloseTo(5.48, 2)
    expect(result.savePerLiter).toBeCloseTo(1.65, 2)
    expect(result.totalSave).toBe(300)
    expect(result.remark).toContain('Spend 1000 yuan, get 300 yuan bonus')
  })
})
