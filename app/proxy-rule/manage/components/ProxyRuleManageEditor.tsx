'use client'

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { RxDragHandleHorizontal } from 'react-icons/rx'
import { TbFileText } from 'react-icons/tb'

import { type UiClashRuleRow, updateProxyRuleClashRules } from '@/app/actions/proxy-rule/clash'
import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'
import Alert, { type AlertImperativeHandler } from '@/components/Alert'
import { EmptyState } from '@/components/EmptyState'
import { FormSelect } from '@/components/FormSelect'
import { Spinner } from '@/components/Spinner'
import { STANDARD_RULE_TYPES } from '@/services/proxy-rule/clash/types'
import { fuzzySearch } from '@/utils/find'

/** Text input styling aligned with {@link FormSelect} (site-wide form controls). */
const FORM_INPUT_CLASS =
  'h-8 w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'

export interface ProxyRuleManageEditorProps {
  /** Stable row ids for React keys */
  initialRows: Array<UiClashRuleRow & { id: string }>
  actions: string[]
}

function SortableRuleRow(props: { id: string; disabled: boolean; orderNo: number; children: ReactNode }) {
  const { id, disabled, orderNo, children } = props
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100 transition-colors hover:bg-gray-50/80">
      <td className="w-16 px-3 py-2 align-middle">
        <div className="flex h-8 items-center gap-2">
          <span className="block w-4 text-center text-[10px] font-medium text-gray-400 leading-none">{orderNo || ''}</span>
          <span
            {...(ready && !disabled ? listeners : {})}
            {...(ready && !disabled ? attributes : {})}
            title={disabled ? 'Unable to reorder in filter mode' : 'Drag to reorder'}
            aria-label="Drag to reorder"
            className={`flex h-8 w-6 select-none items-center justify-center rounded-sm text-gray-400 transition-colors ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab hover:bg-gray-50 hover:text-gray-600 active:cursor-grabbing'
            }`}
          >
            <RxDragHandleHorizontal className="h-4 w-4" />
          </span>
        </div>
      </td>
      {children}
    </tr>
  )
}

/**
 * Authenticated Clash rule editor: edit rows and save to gist via server action.
 * @param props Initial rows and action options from the server
 * @returns Manage UI with filter, table editor, and save action
 */
export function ProxyRuleManageEditor(props: ProxyRuleManageEditorProps) {
  const { initialRows, actions } = props
  const [rows, setRows] = useState(initialRows)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [saving, setSaving] = useState(false)
  const alertRef = useRef<AlertImperativeHandler>(null)

  const typeOptions = useMemo(() => STANDARD_RULE_TYPES.map((t) => ({ value: t, label: t })), [])
  const actionOptions = useMemo(() => actions.map((a) => ({ value: a, label: a })), [actions])
  const typeFilterOptions = useMemo(() => [{ value: 'ALL', label: 'All types' }, ...typeOptions], [typeOptions])

  const visibleRows = useMemo(() => {
    let list = rows
    if (typeFilter !== 'ALL') {
      list = list.filter((row) => row.type === typeFilter)
    }

    const keyword = filter.trim()
    if (!keyword) return list

    return list.filter((row) => {
      if (row.type === 'MATCH') {
        return fuzzySearch(keyword, row.action) || fuzzySearch(keyword, 'MATCH')
      }

      return fuzzySearch(keyword, row.value ?? '') || fuzzySearch(keyword, row.action) || fuzzySearch(keyword, row.type)
    })
  }, [rows, filter, typeFilter])

  const isFilterMode = visibleRows.length !== rows.length

  const emptyMessage = rows.length === 0 ? 'No rules found in gist yet.' : 'No matching rules.'

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  function handleDragEnd(event: DragEndEvent) {
    if (isFilterMode) return
    const { active, over } = event
    if (!over) return

    if (active.id !== over.id) {
      setRows((prev) => {
        const fromIndex = prev.findIndex((rule) => rule.id === String(active.id))
        const toIndex = prev.findIndex((rule) => rule.id === String(over.id))
        if (fromIndex < 0 || toIndex < 0) return prev
        return arrayMove(prev, fromIndex, toIndex)
      })
    }
  }

  function addRow() {
    const id = crypto.randomUUID()
    setRows((prev) => [
      {
        id,
        type: 'DOMAIN-SUFFIX',
        value: '',
        action: actions.includes('DIRECT') ? 'DIRECT' : (actions[0] ?? 'DIRECT'),
      },
      ...prev,
    ])
  }

  function removeRow(id: string) {
    if (!window.confirm('Remove this rule?')) {
      return
    }

    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleSave() {
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const payload: UiClashRuleRow[] = rows.map(({ id: _id, ...rest }) => rest)
      await updateProxyRuleClashRules(payload)
      await alertRef.current?.show('Saved', { type: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed'
      await alertRef.current?.show(message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function updateRow(id: string, patch: Partial<UiClashRuleRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <div className={`${CONTENT_HEADER_CLASS} bg-white`}>
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Manage Clash rules</h2>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="shrink-0">
            <FormSelect value={typeFilter} onChange={setTypeFilter} options={typeFilterOptions} wrapperClassName="w-[168px]" className="!text-xs" id="clash-rule-type-filter" />
          </div>

          <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search (value/action/type)" className={`${FORM_INPUT_CLASS} w-[240px]`} />

          <button
            type="button"
            onClick={addRow}
            className="h-8 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Add rule
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="inline-flex [&_svg]:h-4 [&_svg]:w-4">
                  <Spinner color="text-white" />
                </span>
                Saving…
              </>
            ) : (
              'Save to gist'
            )}
          </button>
        </div>
      </div>

      <Alert ref={alertRef} />

      <div className="min-h-0 flex-1 overflow-auto">
        {visibleRows.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col">
            <EmptyState icon={<TbFileText className="h-12 w-12 text-gray-400/30 opacity-70" />} message={emptyMessage} />
          </div>
        ) : (
          <div className="min-h-full w-full border-t border-gray-200">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <table className="min-w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50 text-[11px] font-medium uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="w-16 px-3 py-2.5">Order</th>
                      <th className="w-[168px] px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Value</th>
                      <th className="w-[140px] px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Flag (IP-CIDR6)</th>
                      <th className="w-24 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {visibleRows.map((row) => {
                      const orderNo = rows.findIndex((r) => r.id === row.id) + 1

                      return (
                        <SortableRuleRow key={row.id} id={row.id} disabled={isFilterMode} orderNo={orderNo}>
                          <td className="w-[168px] px-3 py-2 align-top">
                            <FormSelect
                              id={`rule-type-${row.id}`}
                              value={row.type}
                              onChange={(value) => updateRow(row.id, { type: value })}
                              options={typeOptions}
                              wrapperClassName="max-w-[168px]"
                              className="!text-xs"
                            />
                          </td>

                          <td className="px-3 py-2 align-top">
                            {row.type === 'MATCH' ? (
                              <span className="inline-flex h-8 items-center text-gray-400">—</span>
                            ) : (
                              <input
                                value={row.value ?? ''}
                                onChange={(e) => updateRow(row.id, { value: e.target.value })}
                                className={FORM_INPUT_CLASS}
                                required={row.type !== 'MATCH'}
                              />
                            )}
                          </td>

                          <td className="w-[140px] px-3 py-2 align-top">
                            <FormSelect
                              id={`rule-action-${row.id}`}
                              value={row.action}
                              onChange={(value) => updateRow(row.id, { action: value })}
                              options={actionOptions}
                              wrapperClassName="max-w-[140px]"
                              className="!text-xs"
                            />
                          </td>

                          <td className="px-3 py-2 align-top">
                            {row.type === 'IP-CIDR6' ? (
                              <input value={row.flag ?? ''} onChange={(e) => updateRow(row.id, { flag: e.target.value })} className={FORM_INPUT_CLASS} placeholder="optional" />
                            ) : (
                              <span className="inline-flex h-8 items-center text-gray-400">—</span>
                            )}
                          </td>

                          <td className="px-3 py-2 align-top">
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200"
                            >
                              Remove
                            </button>
                          </td>
                        </SortableRuleRow>
                      )
                    })}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  )
}
