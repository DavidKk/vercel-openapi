import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * Turbopack: support `import x from './file.md?raw'`.
   * We bundle markdown as a string at build time to avoid per-request IO.
   */
  turbopack: {
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.txt', '.md'],
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
  /**
   * Keep webpack config for local/dev environments where Next falls back.
   * Turbopack takes precedence for production builds in Next 16.
   */
  webpack: (config) => {
    config.module?.rules?.push({
      test: /\.md$/i,
      resourceQuery: /raw/,
      type: 'asset/source',
    })
    return config
  },
}

export default nextConfig
