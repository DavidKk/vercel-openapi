interface ModuleManagePlaceholderProps {
  moduleName: string
}

/**
 * Placeholder content for module-level management pages.
 * @param props Placeholder props
 * @returns Centered placeholder card
 */
export function ModuleManagePlaceholder(props: Readonly<ModuleManagePlaceholderProps>) {
  const { moduleName } = props

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Manage</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{moduleName}</h1>
        <p className="mt-2 text-sm text-gray-600">Management entry is enabled for authenticated users. Configuration actions can be added here.</p>
      </div>
    </main>
  )
}
