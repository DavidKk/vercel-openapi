/** Default clash actions discovered when parsing stored rules. */
export const CLASH_DEFAULT_ACTION = ['Proxy', 'DIRECT', 'REJECT'] as const

/** Default Clash YAML filename when PROXY_RULE_CLASH_FILE is unset */
export const DEFAULT_PROXY_RULE_CLASH_FILE_NAME = 'clash.unbnd.yaml'

/**
 * Legacy Clash filename used by vercel-proxy-rule before migration.
 */
export const LEGACY_PROXY_RULE_CLASH_FILE_NAME = 'clash.vercel-proxy-rule.yaml'

/**
 * Preferred YAML filename for new writes (env override or default).
 * @returns File name to use when creating a new clash snippet
 */
export function getProxyRuleClashFileName(): string {
  const name = process.env.PROXY_RULE_CLASH_FILE?.trim()
  return name && name.length > 0 ? name : DEFAULT_PROXY_RULE_CLASH_FILE_NAME
}

/**
 * Ordered YAML filenames to try when reading Clash config (first existing file wins).
 * Order: PROXY_RULE_CLASH_FILE (if set), default name, then legacy migration name.
 * @returns Unique candidate file names in priority order
 */
export function getOrderedClashFileCandidates(): string[] {
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
