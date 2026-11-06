import type { Config } from 'tailwindcss'

/**
 * Gray / white / black resolve to CSS variables from `app/globals.css`.
 * Dark mode inverts those variables on `html[data-theme="dark"]`, so light-mode
 * utilities (`bg-white`, `text-gray-900`, …) adapt without per-callsite `dark:gray-*`.
 */
const grayScale = {
  50: 'rgb(var(--gray-50) / <alpha-value>)',
  100: 'rgb(var(--gray-100) / <alpha-value>)',
  200: 'rgb(var(--gray-200) / <alpha-value>)',
  300: 'rgb(var(--gray-300) / <alpha-value>)',
  400: 'rgb(var(--gray-400) / <alpha-value>)',
  500: 'rgb(var(--gray-500) / <alpha-value>)',
  600: 'rgb(var(--gray-600) / <alpha-value>)',
  700: 'rgb(var(--gray-700) / <alpha-value>)',
  800: 'rgb(var(--gray-800) / <alpha-value>)',
  900: 'rgb(var(--gray-900) / <alpha-value>)',
  950: 'rgb(var(--gray-950) / <alpha-value>)',
} as const

export default {
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  /** Match ticket-janitor: dark via `html[data-theme="dark"]`, not prefers-color-scheme alone. */
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        white: 'rgb(var(--white) / <alpha-value>)',
        black: 'rgb(var(--black) / <alpha-value>)',
        /**
         * Absolute ink that never inverts — use on colored accents
         * (`bg-indigo-*`, `bg-red-*`, …) where `text-white` would flip wrongly.
         */
        pure: {
          white: 'rgb(var(--pure-white) / <alpha-value>)',
          black: 'rgb(var(--pure-black) / <alpha-value>)',
        },
        /** Neutral B/W scale (theme-aware). */
        gray: grayScale,
        /** Alias slate → same neutral scale (login / legacy). */
        slate: grayScale,
      },
      keyframes: {
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-out': 'fade-out .26s forwards',
      },
    },
  },
  plugins: [],
} satisfies Config
