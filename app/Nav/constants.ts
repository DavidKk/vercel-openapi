/**
 * Route prefixes that should hide global Nav and Footer
 * If the current path starts with these prefixes, Nav and Footer will not be displayed
 */
export const HIDDEN_ROUTES: string[] = []

export const DEFAULT_NAV = {
  $private: [
    { name: 'Holiday', href: '/holiday' },
    { name: 'Fuel Price', href: '/fuel-price' },
    { name: 'Geolocation', href: '/geo' },
  ],
}
