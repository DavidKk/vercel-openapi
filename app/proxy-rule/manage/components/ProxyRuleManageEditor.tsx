'use client'

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { memo, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { RxDragHandleHorizontal } from 'react-icons/rx'
import { TbFileText, TbTrash } from 'react-icons/tb'
import { Virtuoso } from 'react-virtuoso'

import { importProxyRuleClashRulesFromYamlText, type UiClashRuleRow, updateProxyRuleClashRules } from '@/app/actions/proxy-rule/clash'
import { CONTENT_PAD_DENSE_CLASS } from '@/app/Nav/constants'
import {
  CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS,
  CONTENT_PAGE_HEADER_BTN_CLASS,
  CONTENT_PAGE_HEADER_BTN_PRIMARY_CLASS,
  CONTENT_PAGE_HEADER_FILTERS_ROW_CLASS,
  CONTENT_PAGE_HEADER_INPUT_CLASS,
  CONTENT_PAGE_HEADER_SELECT_CLASS,
  ContentPageHeader,
} from '@/components/ContentPageHeader'
import { EmptyState } from '@/components/EmptyState'
import { FormSelect, type FormSelectOption } from '@/components/FormSelect'
import { useNotification } from '@/components/Notification'
import { ScrollArea, VirtuosoCustomScroller } from '@/components/ScrollArea'
import { Spinner } from '@/components/Spinner'
import { type ClashRule, type ClashStandardRule, STANDARD_RULE_TYPES, stringifyClashRule } from '@/services/proxy-rule/clash/types'

/** Virtuoso components map — custom scroller hides native bar and shows a 2px indicator. */
const PROXY_RULE_VIRTUOSO_COMPONENTS = { Scroller: VirtuosoCustomScroller }

/** Text input styling aligned with {@link FormSelect} (site-wide form controls). */
const FORM_INPUT_CLASS =
  'h-8 w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500'

/** Same column template for header and rows (horizontal scroll on narrow viewports). */
const PROXY_RULE_GRID_COLS_CLASS = 'grid w-full min-w-[960px] grid-cols-[4rem_168px_minmax(0,1fr)_140px_minmax(7rem,1fr)_3.5rem] items-start'

/**
 * Row height passed to Virtuoso `fixedItemHeight` (aligned with vercel-proxy-rule RuleManager pattern).
 * Keep in sync with cell padding + control height (~52px).
 */
const PROXY_RULE_VIRTUOSO_ITEM_HEIGHT = 52

export interface ProxyRuleManageEditorProps {
  /** Stable row ids for React keys */
  initialRows: Array<UiClashRuleRow & { id: string }>
  actions: string[]
}

/**
 * Latest values read by a stable Virtuoso `itemContent` callback so row edits do not remount list items.
 */
interface ProxyRuleVirtuosoRenderMeta {
  orderNoById: Map<string, number>
  dragDisabled: boolean
  typeOptions: FormSelectOption[]
  actionOptions: FormSelectOption[]
  onPatch: (id: string, patch: Partial<UiClashRuleRow>) => void
  onRemove: (id: string) => void
}

interface ProxyRuleVirtuosoRowProps {
  row: UiClashRuleRow & { id: string }
  orderNo: number
  /** When true, drag reorder is disabled (filtered list) — same idea as vercel-proxy-rule SortableItem.disabled */
  dragDisabled: boolean
  typeOptions: FormSelectOption[]
  actionOptions: FormSelectOption[]
  onPatch: (id: string, patch: Partial<UiClashRuleRow>) => void
  onRemove: (id: string) => void
}

interface ProxyRuleTextInputProps {
  /** Stable id so caret can be restored even if Virtuoso remounts the row */
  selectionKey: string
  value: string
  onChange: (value: string) => void
  className?: string
  required?: boolean
  placeholder?: string
}

/** Survives row remounts; keyed by {@link ProxyRuleTextInputProps.selectionKey}. */
const pendingInputSelectionByKey = new Map<string, { start: number; end: number }>()

/**
 * Controlled text input that restores caret position after parent/Virtuoso remounts.
 * @param props Input value, change handler, and native input attributes
 * @returns Text input element
 */
function ProxyRuleTextInput(props: ProxyRuleTextInputProps) {
  const { selectionKey, value, onChange, className, required, placeholder } = props
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    const el = inputRef.current
    const pending = pendingInputSelectionByKey.get(selectionKey)
    if (!el || !pending) return
    el.focus()
    el.setSelectionRange(pending.start, pending.end)
    pendingInputSelectionByKey.delete(selectionKey)
  }, [selectionKey, value])

  return (
    <input
      ref={inputRef}
      value={value}
      required={required}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        pendingInputSelectionByKey.set(selectionKey, {
          start: e.target.selectionStart ?? 0,
          end: e.target.selectionEnd ?? 0,
        })
        onChange(e.target.value)
      }}
    />
  )
}

/**
 * One virtualized row: dnd-kit sortable wrapper + grid cells. Memoized to limit re-renders while typing.
 */
const ProxyRuleVirtuosoRow = memo(function ProxyRuleVirtuosoRow(props: ProxyRuleVirtuosoRowProps) {
  const { row, orderNo, dragDisabled, typeOptions, actionOptions, onPatch, onRemove } = props
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id, disabled: dragDisabled })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={`${PROXY_RULE_GRID_COLS_CLASS} border-b border-gray-100 bg-white transition-colors hover:bg-gray-50/80`}>
      <div className="flex h-full min-h-[52px] items-center px-2 py-2">
        <div className="flex h-8 w-full items-center gap-2">
          <span className="block w-4 shrink-0 text-center text-[10px] font-medium leading-none text-gray-400">{orderNo || ''}</span>
          <span
            {...(ready && !dragDisabled ? listeners : {})}
            {...(ready && !dragDisabled ? attributes : {})}
            title={dragDisabled ? 'Clear filters to reorder' : 'Drag to reorder'}
            aria-label="Drag to reorder"
            className={`flex h-8 w-6 shrink-0 select-none items-center justify-center rounded-sm text-gray-400 transition-colors ${
              dragDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab hover:bg-gray-50 hover:text-gray-600 active:cursor-grabbing'
            }`}
          >
            <RxDragHandleHorizontal className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className={CONTENT_PAD_DENSE_CLASS}>
        <FormSelect
          id={`rule-type-${row.id}`}
          value={row.type}
          onChange={(value) => onPatch(row.id, { type: value })}
          options={typeOptions}
          wrapperClassName="max-w-[168px]"
          className="!text-xs"
        />
      </div>

      <div className={CONTENT_PAD_DENSE_CLASS}>
        {row.type === 'MATCH' ? (
          <span className="inline-flex h-8 items-center text-gray-400">—</span>
        ) : (
          <ProxyRuleTextInput
            selectionKey={`${row.id}:value`}
            value={row.value ?? ''}
            onChange={(value) => onPatch(row.id, { value })}
            className={FORM_INPUT_CLASS}
            required={row.type !== 'MATCH'}
          />
        )}
      </div>

      <div className={CONTENT_PAD_DENSE_CLASS}>
        <FormSelect
          id={`rule-action-${row.id}`}
          value={row.action}
          onChange={(value) => onPatch(row.id, { action: value })}
          options={actionOptions}
          wrapperClassName="max-w-[140px]"
          className="!text-xs"
        />
      </div>

      <div className={CONTENT_PAD_DENSE_CLASS}>
        {row.type === 'IP-CIDR6' ? (
          <ProxyRuleTextInput
            selectionKey={`${row.id}:flag`}
            value={row.flag ?? ''}
            onChange={(flag) => onPatch(row.id, { flag })}
            className={FORM_INPUT_CLASS}
            placeholder="optional"
          />
        ) : (
          <span className="inline-flex h-8 items-center text-gray-400">—</span>
        )}
      </div>

      <div className="flex items-center justify-center px-2 py-2">
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          title="Remove rule"
          aria-label="Remove rule"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-pure-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
        >
          <TbTrash className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
})

/**
 * Authenticated Clash rule editor: edit rows and save to KV via server action.
 * Virtual list + drag reorder follow the same approach as vercel-proxy-rule `RuleManager` (Virtuoso + dnd-kit, full-list sortable ids).
 * @param props Initial rows and action options from the server
 * @returns Manage UI with filter, virtualized list, and save action
 */
export function ProxyRuleManageEditor(props: ProxyRuleManageEditorProps) {
  const { initialRows, actions: initialActions } = props
  const [rows, setRows] = useState(initialRows)
  const [actions, setActions] = useState<string[]>(initialActions)
  const [filter, setFilter] = useState('')
  const deferredFilter = useDeferredValue(filter)
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const notification = useNotification()

  const typeOptions = useMemo(() => STANDARD_RULE_TYPES.map((t) => ({ value: t, label: t })), [])
  const actionOptions = useMemo(() => actions.map((a) => ({ value: a, label: a })), [actions])
  const typeFilterOptions = useMemo(() => [{ value: 'ALL', label: 'All types' }, ...typeOptions], [typeOptions])

  const visibleRows = useMemo(() => {
    let list = rows
    if (typeFilter !== 'ALL') {
      list = list.filter((row) => row.type === typeFilter)
    }

    const keyword = deferredFilter.trim()
    if (!keyword) return list

    const pattern = keyword.split('').join('.*')
    const regex = new RegExp(pattern, 'i')
    const matchesMatchType = regex.test('MATCH')

    return list.filter((row) => {
      if (row.type === 'MATCH') {
        return regex.test(row.action) || matchesMatchType
      }

      return regex.test(row.value ?? '') || regex.test(row.action) || regex.test(row.type)
    })
  }, [rows, deferredFilter, typeFilter])

  const isFilterMode = visibleRows.length !== rows.length

  /** Full list ids for SortableContext — matches vercel-proxy-rule `items={rules.map((rule) => rule.id)}` */
  const sortableIds = useMemo(() => rows.map((r) => r.id), [rows])

  const orderNoById = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < rows.length; i++) {
      map.set(rows[i].id, i + 1)
    }
    return map
  }, [rows])

  const emptyMessage = rows.length === 0 ? 'No rules found yet.' : 'No matching rules.'

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const patchRow = useCallback((id: string, patch: Partial<UiClashRuleRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const removeRowById = useCallback((id: string) => {
    if (!window.confirm('Remove this rule?')) {
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  function handleDragEnd(event: DragEndEvent) {
    if (isFilterMode) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    setRows((prev) => {
      const from = prev.findIndex((r) => r.id === String(active.id))
      const to = prev.findIndex((r) => r.id === String(over.id))
      if (from < 0 || to < 0) return prev
      return arrayMove(prev, from, to)
    })
  }

  const getVirtuosoRowKey = useCallback((_index: number, row: UiClashRuleRow & { id: string }) => row.id, [])

  /**
   * Keep Virtuoso `itemContent` identity stable across row edits.
   * Recreating this callback (e.g. when orderNoById changes) remounts visible rows and resets input carets.
   */
  const virtuosoRenderMetaRef = useRef<ProxyRuleVirtuosoRenderMeta>({
    orderNoById,
    dragDisabled: isFilterMode,
    typeOptions,
    actionOptions,
    onPatch: patchRow,
    onRemove: removeRowById,
  })
  virtuosoRenderMetaRef.current = {
    orderNoById,
    dragDisabled: isFilterMode,
    typeOptions,
    actionOptions,
    onPatch: patchRow,
    onRemove: removeRowById,
  }

  const renderVirtuosoRow = useCallback((_index: number, row: UiClashRuleRow & { id: string }) => {
    if (!row) return null
    const meta = virtuosoRenderMetaRef.current
    return (
      <ProxyRuleVirtuosoRow
        row={row}
        orderNo={meta.orderNoById.get(row.id) ?? 0}
        dragDisabled={meta.dragDisabled}
        typeOptions={meta.typeOptions}
        actionOptions={meta.actionOptions}
        onPatch={meta.onPatch}
        onRemove={meta.onRemove}
      />
    )
  }, [])

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

  async function handleSave() {
    setSaving(true)
    try {
      const payload: UiClashRuleRow[] = rows.map((row) => {
        const { id, ...rest } = row
        void id
        return rest
      })
      await updateProxyRuleClashRules(payload)
      notification.success('Saved successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed'
      notification.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleImportYamlFile(file: File) {
    setImporting(true)
    try {
      const yamlText = await file.text()
      const result = await importProxyRuleClashRulesFromYamlText(yamlText)
      setActions(result.actions)

      const nextRows: Array<UiClashRuleRow & { id: string }> = result.rules.map((rule) => {
        const id = crypto.randomUUID()
        if (rule.type === 'MATCH') {
          return { id, type: rule.type, action: rule.action }
        }
        if (rule.type === 'IP-CIDR6') {
          return { id, type: rule.type, value: rule.value, action: rule.action, ...(rule.flag ? { flag: rule.flag } : {}) }
        }
        return { id, type: rule.type, value: rule.value, action: rule.action }
      })

      setRows(nextRows)
      setFilter('')
      setTypeFilter('ALL')
      notification.success('Imported changes. Click Save to apply.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed'
      notification.error(message)
    } finally {
      setImporting(false)
    }
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  function uiRowToClashRule(row: UiClashRuleRow): ClashRule {
    const { type, action } = row
    if (type === 'MATCH') {
      return { type: 'MATCH', action }
    }

    if (type === 'IP-CIDR6') {
      return {
        type: 'IP-CIDR6',
        value: row.value?.trim() ?? '',
        action,
        ...(row.flag ? { flag: row.flag } : {}),
      }
    }

    return {
      type: type as ClashStandardRule['type'],
      value: row.value?.trim() ?? '',
      action,
    } as ClashRule
  }

  function downloadTextFile(fileName: string, text: string, mimeType: string) {
    const blob = new Blob([text], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function yamlQuote(value: string): string {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    return `"${escaped}"`
  }

  function handleExportYamlClick() {
    const ruleStrings = rows
      .map((r) => uiRowToClashRule(r))
      .map((r) => stringifyClashRule(r))
      .filter((s) => !!s)
    const yamlText = `rules:\n${ruleStrings.map((s) => `  - ${yamlQuote(s)}`).join('\n')}\n`
    downloadTextFile('clash.rules.yaml', yamlText, 'text/yaml;charset=utf-8')
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <ContentPageHeader title="Manage Clash rules" description="Edit Clash rules stored in KV. Filter and reorder rows, then Save to apply." className="bg-white">
        <div className={CONTENT_PAGE_HEADER_FILTERS_ROW_CLASS}>
          <div className="shrink-0">
            <FormSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeFilterOptions}
              wrapperClassName="w-[168px]"
              className={CONTENT_PAGE_HEADER_SELECT_CLASS}
              id="clash-rule-type-filter"
            />
          </div>

          {/** Fixed width so the scrollable toolbar keeps a stable search control size */}
          <div className="w-[11rem] shrink-0">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search (value/action/type)"
              className={`${CONTENT_PAGE_HEADER_INPUT_CLASS} w-full`}
            />
          </div>
        </div>

        <div className={CONTENT_PAGE_HEADER_ACTIONS_ROW_CLASS}>
          <button type="button" onClick={addRow} className={CONTENT_PAGE_HEADER_BTN_CLASS}>
            Add rule
          </button>

          <button type="button" disabled={saving || importing} onClick={handleExportYamlClick} className={CONTENT_PAGE_HEADER_BTN_CLASS} title="Export current clash rules as YAML">
            Export
          </button>

          <button type="button" disabled={saving || importing} onClick={handleImportClick} className={CONTENT_PAGE_HEADER_BTN_CLASS} title="Import clash YAML and preview rules">
            {importing ? 'Importing…' : 'Import'}
          </button>

          <button type="button" disabled={saving} onClick={() => void handleSave()} className={CONTENT_PAGE_HEADER_BTN_PRIMARY_CLASS}>
            {saving ? (
              <>
                <span className="inline-flex [&_svg]:h-4 [&_svg]:w-4">
                  <Spinner color="text-pure-white" />
                </span>
                Saving…
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </ContentPageHeader>

      <input
        ref={importInputRef}
        type="file"
        accept="application/x-yaml,text/yaml,.yaml,.yml"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          e.currentTarget.value = ''
          await handleImportYamlFile(file)
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-gray-200">
        {visibleRows.length === 0 ? (
          <div className="flex min-h-[240px] flex-1 flex-col">
            <EmptyState icon={<TbFileText className="h-12 w-12 text-gray-400/30 opacity-70" />} message={emptyMessage} />
          </div>
        ) : (
          <ScrollArea className="min-h-0 min-w-0 flex-1" indicator="horizontal" reserveGutter={false} scrollClassName="flex min-h-0 flex-col">
            <div className="flex h-full min-h-0 min-w-[960px] flex-1 flex-col">
              <div className={`shrink-0 ${PROXY_RULE_GRID_COLS_CLASS} border-b border-gray-200 bg-gray-50 text-[11px] font-medium uppercase tracking-wide text-gray-600`}>
                <div className={CONTENT_PAD_DENSE_CLASS}>Order</div>
                <div className={CONTENT_PAD_DENSE_CLASS}>Type</div>
                <div className={CONTENT_PAD_DENSE_CLASS}>Value</div>
                <div className={CONTENT_PAD_DENSE_CLASS}>Action</div>
                <div className={CONTENT_PAD_DENSE_CLASS}>Flag (IP-CIDR6)</div>
                <div className={CONTENT_PAD_DENSE_CLASS} />
              </div>
              <div className="min-h-0 min-w-0 flex-1">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    <Virtuoso
                      style={{ height: '100%' }}
                      data={visibleRows}
                      computeItemKey={getVirtuosoRowKey}
                      fixedItemHeight={PROXY_RULE_VIRTUOSO_ITEM_HEIGHT}
                      itemContent={renderVirtuosoRow}
                      components={PROXY_RULE_VIRTUOSO_COMPONENTS}
                    />
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
