/**
 * Movie hot/popularity status levels (aligned with veil).
 */
export enum MovieHotStatus {
  /** Highly anticipated – not yet released with high popularity */
  HIGHLY_ANTICIPATED = 'highly_anticipated',
  /** Very hot – high popularity and good ratings */
  VERY_HOT = 'very_hot',
  /** Average – moderate popularity */
  AVERAGE = 'average',
  /** Niche – low popularity */
  NICHE = 'niche',
}
