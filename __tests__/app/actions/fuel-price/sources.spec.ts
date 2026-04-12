import { parseNextAdjustmentDate, parseXiaoxiongyouhaoFuelPriceData } from '@/app/actions/fuel-price/sources'

describe('parseXiaoxiongyouhaoFuelPriceData', () => {
  it('should parse price-table rows and use dash for 98# when not listed', () => {
    const html = `
<div>下次调价：2026-04-22</div>
<table class="price-table"><thead><tr><th>省份</th><th>92#</th><th>95#</th><th>0#柴</th></tr></thead><tbody>
<tr>
  <td class="region-name"><a href="/f">北京市</a></td>
  <td>8.90</td>
  <td>9.48</td>
  <td>8.66</td>
</tr>
</tbody></table>`

    const rows = parseXiaoxiongyouhaoFuelPriceData(html)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      province: '北京市',
      b92: '8.90',
      b95: '9.48',
      b98: '-',
      b0: '8.66',
    })
    expect(parseNextAdjustmentDate(html)).toBe('2026-04-22')
  })
})
