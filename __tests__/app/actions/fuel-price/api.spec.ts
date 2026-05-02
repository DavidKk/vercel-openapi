import { hasFuelPriceChanged } from '@/app/actions/fuel-price/api'
import type { FuelPrice } from '@/app/actions/fuel-price/types'

const baseFuelPrice: FuelPrice = {
  lastUpdated: '2026-05-02T00:00:00.000Z',
  data: [
    { province: '北京市', b92: '7.11', b95: '7.57', b98: '-', b0: '6.81' },
    { province: '上海市', b92: '7.07', b95: '7.52', b98: '-', b0: '6.76' },
  ],
}

describe('hasFuelPriceChanged', () => {
  it('should ignore province row order when prices are unchanged', () => {
    const reorderedFuelPrice: FuelPrice = {
      lastUpdated: '2026-05-02T01:00:00.000Z',
      data: [...baseFuelPrice.data].reverse(),
    }

    expect(hasFuelPriceChanged(reorderedFuelPrice, baseFuelPrice)).toBe(false)
  })

  it('should detect price changes for the same province', () => {
    const changedFuelPrice: FuelPrice = {
      lastUpdated: '2026-05-02T01:00:00.000Z',
      data: [{ province: '北京市', b92: '7.21', b95: '7.57', b98: '-', b0: '6.81' }, baseFuelPrice.data[1]],
    }

    expect(hasFuelPriceChanged(changedFuelPrice, baseFuelPrice)).toBe(true)
  })
})
