/**
 * Third-party rule-providers appended to the sample Clash config (same idea as vercel-proxy-rule).
 */
export const THIRD_PARTY_REJECT_RULE_PROVIDERS = [
  {
    type: 'http',
    behavior: 'classical',
    interval: 86400,
    format: 'yaml',
    url: 'https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Advertising/Advertising_Classical.yaml',
    name: 'Advertising_Classical',
    path: './rules/Advertising_Classical.yaml',
  },
] as const
