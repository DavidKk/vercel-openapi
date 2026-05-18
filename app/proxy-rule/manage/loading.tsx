import { ProxyRuleManageSkeleton } from '@/components/manage'

/**
 * Instant shell while proxy-rule manage page loads rules from KV.
 * @returns Proxy rule manage skeleton
 */
export default function ProxyRuleManageLoading() {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <ProxyRuleManageSkeleton />
    </section>
  )
}
