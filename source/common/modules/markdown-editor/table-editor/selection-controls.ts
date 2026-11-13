/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table selection controls
 * License:         GNU GPL v3
 *
 * Description:     Accessible controls for selecting, moving, and deleting table parts.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import type { EditorView } from '@codemirror/view'
import { tableControlIcon } from './icons/control-icons'
import { selectTablePart } from './selection'
import { deleteCol, swapPrevCol, swapNextCol } from './commands/columns'
import { deleteRow, swapPrevRow, swapNextRow } from './commands/rows'

/** Edge controls select cells without entering a cell's text editor. */
function generateSelectionControl (view: EditorView, part: 'row'|'column'|'table'): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.classList.add('cm-table-select', part)
  const label = part === 'row' ? trans('Select row') : part === 'column' ? trans('Select column') : trans('Select table')
  button.title = label
  button.setAttribute('aria-label', label)
  button.innerHTML = tableControlIcon(part)
  button.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
  })
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    const cell = button.closest<HTMLTableCellElement>('td, th')
    if (cell !== null) { selectTablePart(view, part, Number(cell.dataset.cellFrom)) }
  })
  return button
}

/** Delete the indicated row or column using the editor's existing commands. */
function generateDeleteControl (view: EditorView, part: 'row'|'column'): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.classList.add('cm-table-delete', part)
  const label = part === 'row' ? trans('Delete row') : trans('Delete column')
  button.title = label
  button.setAttribute('aria-label', label)
  button.innerHTML = tableControlIcon('minus')
  button.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
  })
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    const cell = button.closest<HTMLTableCellElement>('td, th')
    if (cell === null) { return }
    // Target this control's cell, regardless of the previous cursor or rectangle.
    view.dispatch({ selection: { anchor: Number(cell.dataset.cellFrom) } })
    if (part === 'row') { deleteRow(view) } else { deleteCol(view) }
    view.focus()
  })
  return button
}

/** Move the control's row or column, independently of the current cursor. */
function generateMoveControl (view: EditorView, part: 'row'|'column', direction: 'previous'|'next'): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.classList.add('cm-table-move', part, direction)
  const previous = direction === 'previous'
  const label = part === 'row'
    ? previous ? trans('Move row up') : trans('Move row down')
    : previous ? trans('Move column left') : trans('Move column right')
  button.title = label
  button.setAttribute('aria-label', label)
  button.innerHTML = tableControlIcon(part === 'row' ? previous ? 'up' : 'down' : previous ? 'left' : 'right')
  button.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
  })
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    const cell = button.closest<HTMLTableCellElement>('td, th')
    if (cell === null) { return }
    view.dispatch({ selection: { anchor: Number(cell.dataset.cellFrom) } })
    const command = part === 'row'
      ? previous ? swapPrevRow : swapNextRow
      : previous ? swapPrevCol : swapNextCol
    command(view)
    view.focus()
  })
  return button
}

/** Keep buttons mounted so updates do not discard keyboard focus. */
export function updateTableControls (cell: HTMLTableCellElement, view: EditorView, row: number, col: number, rowCount?: number, columnCount?: number): void {
  for (const part of [ 'row', 'column', 'table' ] as const) {
    const needed = part === 'row' ? col === 0 : part === 'column' ? row === 0 : row === 0 && col === 0
    const selection = cell.querySelector<HTMLButtonElement>(`.cm-table-select.${part}`)
    let actions = cell.querySelector<HTMLDivElement>(`.cm-table-actions.${part}`)
    if (!needed) {
      selection?.remove()
      actions?.remove()
      continue
    }
    if (selection === null) { cell.appendChild(generateSelectionControl(view, part)) }
    if (part === 'table') { continue }
    if (actions === null) {
      actions = document.createElement('div')
      actions.classList.add('cm-table-actions', part)
      actions.setAttribute('role', 'group')
      actions.setAttribute('aria-label', part === 'row' ? trans('Row') : trans('Column'))
      actions.append(
        generateMoveControl(view, part, 'previous'),
        generateMoveControl(view, part, 'next'),
        generateDeleteControl(view, part)
      )
      cell.appendChild(actions)
    }
    const index = part === 'row' ? row : col
    const count = part === 'row' ? rowCount : columnCount
    actions.querySelector<HTMLButtonElement>('.cm-table-move.previous')!.disabled = index === 0
    actions.querySelector<HTMLButtonElement>('.cm-table-move.next')!.disabled = count !== undefined && index === count - 1
  }
}
