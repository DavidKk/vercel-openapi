export enum PriceLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  ACCEPTABLE = 'acceptable',
  HIGH = 'high',
  EXPENSIVE = 'expensive',
  VERY_EXPENSIVE = 'very_expensive',
}

/**
 * Converts price level enum to display text.
 * @param level Price level
 * @returns Display text
 */
export function getPriceLevelText(level: PriceLevel): string {
  switch (level) {
    case PriceLevel.EXCELLENT:
      return '非常划算'
    case PriceLevel.GOOD:
      return '价格合理'
    case PriceLevel.ACCEPTABLE:
      return '可以接受'
    case PriceLevel.HIGH:
      return '价格偏高'
    case PriceLevel.EXPENSIVE:
      return '价格较高'
    default:
      return '全家宝'
  }
}

/**
 * Calculates price level by comparing current and baseline price.
 * @param currentUnitPrice Current calculated unit price
 * @param unitBestPrice Baseline unit price
 * @returns Price level
 */
export function calculatePriceLevel(currentUnitPrice: number, unitBestPrice: number): PriceLevel {
  if (unitBestPrice <= 0) {
    return PriceLevel.ACCEPTABLE
  }

  const ratio = currentUnitPrice / unitBestPrice
  if (ratio <= 0.7) return PriceLevel.EXCELLENT
  if (ratio <= 0.9) return PriceLevel.GOOD
  if (ratio <= 1.1) return PriceLevel.ACCEPTABLE
  if (ratio <= 1.3) return PriceLevel.HIGH
  if (ratio <= 1.5) return PriceLevel.EXPENSIVE
  return PriceLevel.VERY_EXPENSIVE
}
