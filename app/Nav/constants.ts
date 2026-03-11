/**
 * Route prefixes that should hide global Nav and Footer
 * If the current path starts with these prefixes, Nav and Footer will not be displayed
 */
/** Route prefixes that hide global Nav and Footer (e.g. full-screen calendar) */
export const HIDDEN_ROUTES: string[] = ['/holiday']

export const DEFAULT_NAV = {
  $private: [
    { name: 'Holiday', href: '/holiday' },
    { name: 'Fuel Price', href: '/fuel-price' },
    { name: 'Geolocation', href: '/geo' },
  ],
}
