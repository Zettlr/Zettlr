/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table cell selections
 * License:         GNU GPL v3
 *
 * Description:     State and interactions for rectangular selections in pipe tables.
 *
 * END HEADER
 */

/**
 * Rectangular table selections are separate from the text selection: selecting
 * a column must not select the intervening cells or the pipe delimiters.
 */
import { StateEffect, StateField, Prec, EditorSelection, type EditorState } from '@codemirror/state'
import { ensureSyntaxTree } from '@codemirror/language'
import type { EditorView } from '@codemirror/view'
import { ViewPlugin, keymap } from '@codemirror/view'
import type { Table } from '../../markdown-utils/markdown-ast'
import { parseTableNode } from '../../markdown-utils/markdown-ast/parse-table-node'
import { getCoordinatesForRange } from './commands/util'

export interface CellPosition { row: number, col: number }
export interface TableSelection {
  tableFrom: number
  anchor: CellPosition
  head: CellPosition
}

export const setTableSelection = StateEffect.define<TableSelection|null>()
export const tableSelectionField = StateField.define<TableSelection|null>({
  create: () => null,
  update (selection, tr) {
    // Never retain stale coordinates after editing, undo, or moving the cursor.
    if (tr.docChanged || tr.selection !== undefined) {
      selection = null
    }
    for (const effect of tr.effects) {
      if (effect.is(setTableSelection)) {
        selection = effect.value
      }
    }
    return selection
  }
})

function tableAt (state: EditorState, from: number): Table|undefined {
  const node = ensureSyntaxTree(state, state.doc.length, 500)?.topNode.getChildren('Table')
    .find(node => node.from <= from && node.to >= from)
  if (node === undefined) { return undefined }
  const table = parseTableNode(node, state.sliceDoc())
  return table.type === 'Table' && table.tableType === 'pipe' ? table : undefined
}

export function cellIsSelected (selection: TableSelection|null|undefined, tableFrom: number, row: number, col: number): boolean {
  return selection != null && selection.tableFrom === tableFrom &&
    row >= Math.min(selection.anchor.row, selection.head.row) &&
    row <= Math.max(selection.anchor.row, selection.head.row) &&
    col >= Math.min(selection.anchor.col, selection.head.col) &&
    col <= Math.max(selection.anchor.col, selection.head.col)
}

export function selectTablePart (view: EditorView, part: 'row'|'column'|'table', cellFrom = view.state.selection.main.head): boolean {
  const table = tableAt(view.state, cellFrom)
  if (table === undefined) { return false }
  const position = getCoordinatesForRange(EditorSelection.cursor(cellFrom), table)
  if (position === undefined) { return false }
  const anchor = {
    row: part === 'row' ? position.row : 0,
    col: part === 'column' ? position.col : 0
  }
  const head = {
    row: part === 'row' ? position.row : table.rows.length - 1,
    col: part === 'column' ? position.col : table.alignment.length - 1
  }
  view.dispatch({
    selection: { anchor: table.rows[anchor.row].cells[anchor.col].from },
    effects: setTableSelection.of({ tableFrom: table.from, anchor, head })
  })
  view.focus()
  return true
}

/** Move the active corner while keeping the original selection anchor. */
export function extendTableSelection (view: EditorView, rowDelta: number, colDelta: number): boolean {
  const selection = view.state.field(tableSelectionField, false)
  if (selection == null) { return false }
  const table = tableAt(view.state, selection.tableFrom)
  if (table === undefined) { return false }
  const head = {
    row: Math.max(0, Math.min(table.rows.length - 1, selection.head.row + rowDelta)),
    col: Math.max(0, Math.min(table.alignment.length - 1, selection.head.col + colDelta))
  }
  view.dispatch({ effects: setTableSelection.of({ ...selection, head }) })
  return true
}

/** Copy a standalone Markdown table while preserving cell contents and alignment. */
export function selectedTableMarkdown (state: EditorState): string|undefined {
  const selection = state.field(tableSelectionField, false)
  if (selection == null) { return undefined }
  const table = tableAt(state, selection.tableFrom)
  if (table === undefined) { return undefined }
  const firstRow = Math.min(selection.anchor.row, selection.head.row)
  const lastRow = Math.max(selection.anchor.row, selection.head.row)
  const firstCol = Math.min(selection.anchor.col, selection.head.col)
  const lastCol = Math.max(selection.anchor.col, selection.head.col)
  const fullWidth = firstCol === 0 && lastCol === table.alignment.length - 1
  if (firstRow === 0 && lastRow === table.rows.length - 1 && fullWidth) {
    return state.sliceDoc(table.from, table.to)
  }
  const header = table.rows[0]
  const delimiter = state.doc.line(state.doc.lineAt(header.to).number + 1).text
  const parts = delimiter.trim().replace(/^\|/, '').replace(/\|$/, '').split(/[|+]/)
  const selectedDelimiter = fullWidth ? delimiter : '|' + parts.slice(firstCol, lastCol + 1).join('|') + '|'
  const lines: string[] = []
  if (firstRow > 0) {
    // A body-only rectangle needs its own header; keep every selected row as data.
    lines.push('|' + Array(lastCol - firstCol + 1).fill(' ').join('|') + '|', selectedDelimiter)
  }
  for (let row = firstRow; row <= lastRow; row++) {
    const current = table.rows[row]
    if (current === undefined) { return undefined }
    const cells = current.cells.slice(firstCol, lastCol + 1)
    lines.push(fullWidth ? state.sliceDoc(current.from, current.to) :
      '|' + cells.map(cell => state.sliceDoc(cell.padding.from, cell.padding.to)).join('|') + '|')
    if (current.isHeaderOrFooter) { lines.push(selectedDelimiter) }
  }
  return lines.join('\n')
}

/** Clear cell contents while preserving the structure of the table. */
export function clearSelectedCells (view: EditorView): boolean {
  const selection = view.state.field(tableSelectionField, false)
  if (selection == null) { return false }
  const table = tableAt(view.state, selection.tableFrom)
  if (table === undefined) { return false }
  const changes = table.rows.flatMap((row, r) => row.cells
    .filter((_cell, c) => cellIsSelected(selection, table.from, r, c))
    .map(cell => ({ from: cell.from, to: cell.to, insert: '' })))
  view.dispatch({ changes, effects: setTableSelection.of(null), userEvent: 'delete.selection' })
  return true
}

export function copyTableSelection (view: EditorView, cut = false): boolean {
  const state = view.state
  const text = selectedTableMarkdown(view.state)
  if (text === undefined) { return false }
  navigator.clipboard.writeText(text).then(() => {
    // Clipboard access can fail or finish after the user has changed documents.
    if (cut && view.state === state) { clearSelectedCells(view) }
  }).catch(err => console.error(err))
  return true
}

const mouseSelection = ViewPlugin.fromClass(class {
  private origin: { table: HTMLTableElement, selection: TableSelection }|undefined
  private dragging = false

  constructor (private readonly view: EditorView) {
    view.dom.addEventListener('mousedown', this.down, true)
    view.dom.addEventListener('copy', this.copy, true)
    view.dom.addEventListener('cut', this.cut, true)
    view.dom.ownerDocument.addEventListener('mousemove', this.move)
    view.dom.ownerDocument.addEventListener('mouseup', this.up)
  }

  private readonly down = (event: MouseEvent): void => {
    if (event.button !== 0) { return }
    const cell = event.target instanceof Element ? event.target.closest<HTMLTableCellElement>('td[data-cell-from], th[data-cell-from]') : null
    const table = cell?.closest<HTMLTableElement>('table')
    if (cell == null || table == null || !this.view.dom.contains(table) ||
      (event.target instanceof Element && event.target.closest('.plus, .grab-handle, .cm-table-select, .cm-table-actions, a') !== null)) { return }
    const position = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
    const previous = this.view.state.field(tableSelectionField, false)
    const selection = {
      tableFrom: Number(table.dataset.tableFrom),
      anchor: event.shiftKey && previous?.tableFrom === Number(table.dataset.tableFrom) ? previous.anchor : position,
      head: position
    }
    this.origin = { table, selection }
    this.dragging = false
    // Without a cell selection, Shift-click belongs to the cell's text editor.
    if (previous != null) {
      event.preventDefault()
      event.stopImmediatePropagation()
      this.view.dispatch({
        selection: { anchor: Number(cell.dataset.cellFrom) },
        effects: setTableSelection.of(event.shiftKey ? selection : null)
      })
      this.view.focus()
    }
  }

  private readonly move = (event: MouseEvent): void => {
    if (this.origin === undefined || (event.buttons & 1) === 0) { return }
    const target = this.view.dom.ownerDocument.elementFromPoint(event.clientX, event.clientY)
    const cell = target?.closest<HTMLTableCellElement>('td[data-cell-from], th[data-cell-from]')
    if (cell == null || cell.closest('table') !== this.origin.table) { return }
    const head = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
    const { anchor } = this.origin.selection
    if (!this.dragging && head.row === anchor.row && head.col === anchor.col) { return }
    const current = this.view.state.field(tableSelectionField, false)
    if (this.dragging && current?.tableFrom === this.origin.selection.tableFrom &&
      current.head.row === head.row && current.head.col === head.col) { return }
    this.dragging = true
    event.preventDefault()
    event.stopPropagation()
    this.view.dispatch({ effects: setTableSelection.of({ ...this.origin.selection, head }) })
    this.view.focus()
    this.view.dom.ownerDocument.getSelection()?.removeAllRanges()
  }

  private readonly up = (): void => {
    this.origin = undefined
    this.dragging = false
  }

  private readonly copy = (event: ClipboardEvent): void => {
    const text = selectedTableMarkdown(this.view.state)
    if (text === undefined || event.clipboardData === null) { return }
    event.preventDefault()
    event.stopImmediatePropagation()
    event.clipboardData.setData('text/plain', text)
  }

  private readonly cut = (event: ClipboardEvent): void => {
    const selected = selectedTableMarkdown(this.view.state) !== undefined
    this.copy(event)
    if (selected && event.defaultPrevented) { clearSelectedCells(this.view) }
  }

  destroy (): void {
    this.view.dom.removeEventListener('mousedown', this.down, true)
    this.view.dom.removeEventListener('copy', this.copy, true)
    this.view.dom.removeEventListener('cut', this.cut, true)
    this.view.dom.ownerDocument.removeEventListener('mousemove', this.move)
    this.view.dom.ownerDocument.removeEventListener('mouseup', this.up)
  }
})

export const tableSelection = [
  tableSelectionField,
  mouseSelection,
  Prec.high(keymap.of([
    { key: 'Shift-ArrowUp', run: view => extendTableSelection(view, -1, 0) },
    { key: 'Shift-ArrowDown', run: view => extendTableSelection(view, 1, 0) },
    { key: 'Shift-ArrowLeft', run: view => extendTableSelection(view, 0, -1) },
    { key: 'Shift-ArrowRight', run: view => extendTableSelection(view, 0, 1) },
    { key: 'Mod-c', run: view => copyTableSelection(view) },
    { key: 'Mod-x', run: view => copyTableSelection(view, true) },
    { key: 'Backspace', run: clearSelectedCells },
    { key: 'Delete', run: clearSelectedCells },
    { key: 'Escape', run: view => {
      if (view.state.field(tableSelectionField) === null) { return false }
      view.dispatch({ effects: setTableSelection.of(null) })
      return true
    } }
  ]))
]
