import { randomUUID } from 'crypto'

import { loadProxyRuleClashRulesForManage, type UiClashRuleRow } from '@/app/actions/proxy-rule/clash'
import { checkAccess } from '@/services/auth/access'

import { ProxyRuleManageEditor } from './components/ProxyRuleManageEditor'

/**
 * Authenticated manage page for Clash rules stored in gist.
 */
export default async function ProxyRuleManagePage() {
  await checkAccess({ isApiRouter: false })

  const { rules, actions } = await loadProxyRuleClashRulesForManage()

  const initialRows: Array<UiClashRuleRow & { id: string }> = rules.map((rule) => {
    if (rule.type === 'MATCH') {
      return { id: randomUUID(), type: rule.type, action: rule.action }
    }

    if (rule.type === 'IP-CIDR6') {
      return {
        id: randomUUID(),
        type: rule.type,
        value: rule.value,
        action: rule.action,
        ...(rule.flag ? { flag: rule.flag } : {}),
      }
    }

    return {
      id: randomUUID(),
      type: rule.type,
      value: rule.value,
      action: rule.action,
    }
  })

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <ProxyRuleManageEditor initialRows={initialRows} actions={actions} />
    </section>
  )
}
