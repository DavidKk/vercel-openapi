/** Default clash actions discovered when parsing gist rules. */
export const CLASH_DEFAULT_ACTION = ['Proxy', 'DIRECT', 'REJECT'] as const

/** Default Clash gist filename when PROXY_RULE_CLASH_FILE is unset */
export const DEFAULT_PROXY_RULE_CLASH_FILE_NAME = 'clash.unbnd.yaml'

/**
 * Legacy Clash gist filename used by vercel-proxy-rule before migration.
 */
export const LEGACY_PROXY_RULE_CLASH_FILE_NAME = 'clash.vercel-proxy-rule.yaml'

/**
 * Preferred gist filename for new writes (env override or default).
 * @returns File name to use when creating a new clash snippet in the gist
 */
export function getProxyRuleClashFileName(): string {
  const name = process.env.PROXY_RULE_CLASH_FILE?.trim()
  return name && name.length > 0 ? name : DEFAULT_PROXY_RULE_CLASH_FILE_NAME
}

/**
 * Ordered gist filenames to try when reading Clash YAML (first existing file wins).
 * Order: PROXY_RULE_CLASH_FILE (if set), default name, then legacy migration name.
 * @returns Unique candidate file names in priority order
 */
export function getOrderedClashGistFileCandidates(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const env = process.env.PROXY_RULE_CLASH_FILE?.trim()
  if (env) {
    seen.add(env)
    out.push(env)
  }
  if (!seen.has(DEFAULT_PROXY_RULE_CLASH_FILE_NAME)) {
    seen.add(DEFAULT_PROXY_RULE_CLASH_FILE_NAME)
    out.push(DEFAULT_PROXY_RULE_CLASH_FILE_NAME)
  }
  if (!seen.has(LEGACY_PROXY_RULE_CLASH_FILE_NAME)) {
    seen.add(LEGACY_PROXY_RULE_CLASH_FILE_NAME)
    out.push(LEGACY_PROXY_RULE_CLASH_FILE_NAME)
  }
  return out
}
