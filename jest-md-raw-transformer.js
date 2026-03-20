const path = require('path')

/**
 * Jest transformer for markdown imports.
 *
 * We use it to support `import x from './skill.md?raw'` in tests by:
 * 1) mapping `*.md?raw` -> `*.md` (moduleNameMapper)
 * 2) transforming `*.md` into a JS module that exports the file content string.
 */
module.exports = {
  process(src, filename) {
    // `src` is the file content provided by Jest.
    const content = typeof src === 'string' ? src : String(src)
    const json = JSON.stringify(content)

    // Support both `import foo from` (default) and require.
    return {
      code: `module.exports = ${json}; module.exports.default = module.exports;`,
    }
  },
}
