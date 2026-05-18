import { randomUUID } from 'crypto'
import { Suspense } from 'react'

import { loadProxyRuleClashRulesForManage, type UiClashRuleRow } from '@/app/actions/proxy-rule/clash'
import { ProxyRuleManageSkeleton } from '@/components/manage'
import { checkAccess } from '@/services/auth/access'

import { ProxyRuleManageEditor } from './components/ProxyRuleManageEditor'

/**
 * Loads clash rules after shell renders (Suspense shows skeleton during fetch).
 * @returns Proxy rule manage editor with initial rows
 */
async function ProxyRuleManageContent() {
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

  return <ProxyRuleManageEditor initialRows={initialRows} actions={actions} />
}

/**
 * Authenticated manage page for Clash rules stored in KV.
 * @returns Manage page with streaming shell
 */
export default function ProxyRuleManagePage() {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <Suspense fallback={<ProxyRuleManageSkeleton />}>
        <ProxyRuleManageContent />
      </Suspense>
    </section>
  )
}
