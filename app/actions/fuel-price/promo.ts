export interface RechargePromoResult {
  pay: number // Actual payment amount
  bonus: number // Bonus amount
  balance: number // Total balance (pay + bonus)
  liters: number // Total liters of fuel
  effectivePrice: number // Effective fuel price
  savePerLiter: number // Savings per liter
  totalSave: number // Total savings
  remark: string // Description
}

/**
 * Calculate recharge promotion
 * @param price Fuel price (yuan/liter)
 * @param pay Actual payment amount (yuan)
 * @param bonus Bonus amount (yuan)
 */
export function calcRechargePromo(price: number, pay: number, bonus: number): RechargePromoResult {
  /** Total balance */
  const balance = pay + bonus
  /** Total liters of fuel */
  const liters = balance / price
  /** Effective fuel price */
  const effectivePrice = pay / liters
  /** Savings per liter */
  const savePerLiter = price - effectivePrice
  /** Total savings, equal to bonus amount */
  const totalSave = bonus

  const remark = `Spend ${pay} yuan, get ${bonus} yuan bonus, total ${balance} yuan, can buy ${liters.toFixed(2)} liters, effective price ${effectivePrice.toFixed(2)} yuan/liter, save ${savePerLiter.toFixed(2)} yuan per liter`

  return {
    pay,
    bonus,
    balance,
    liters: parseFloat(liters.toFixed(2)),
    effectivePrice: parseFloat(effectivePrice.toFixed(2)),
    savePerLiter: parseFloat(savePerLiter.toFixed(2)),
    totalSave,
    remark,
  }
}
