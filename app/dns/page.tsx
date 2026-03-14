import { DnsQueryForm } from '@/app/dns/components'

/**
 * DNS Query overview page content: used inside /dns layout.
 * Layout is responsible for header and sidebar; this page only renders main content.
 */
export default function DnsPage() {
  return (
    <section className="flex h-full flex-col">
      <DnsQueryForm />
    </section>
  )
}
