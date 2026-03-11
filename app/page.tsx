import { generate } from '@/components/Meta'

import { HomeClient } from './HomeClient'

const { generateMetadata } = generate({
  title: 'Unbnd',
  description:
    'This service collects and caches commonly used public OPENAPIs to facilitate developer access. It provides caching and forwarding services for commonly used public APIs, making it easier for developers to quickly access them.',
})

export { generateMetadata }

/**
 * Home page: brief intro centered below the header. Use header icons to open each module.
 * @returns Home page layout with intro and client-side skill install command helper
 */
export default function Home() {
  return <HomeClient />
}
