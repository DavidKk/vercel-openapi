import { generate } from '@/components/Meta'

const { generateMetadata } = generate({
  title: 'Open APIs',
  description:
    'This service collects and caches commonly used public OPENAPIs to facilitate developer access. It provides caching and forwarding services for commonly used public APIs, making it easier for developers to quickly access them.',
})

export { generateMetadata }

/**
 * Home page: brief intro centered below the header. Use header icons to open each module.
 */
export default function Home() {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md text-center">
        <p className="text-sm text-gray-600">Commonly used public APIs in one place. Use the icons above to open each module.</p>
      </div>
    </main>
  )
}
