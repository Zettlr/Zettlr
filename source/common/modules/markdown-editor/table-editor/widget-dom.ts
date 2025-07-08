import { type EditorView } from '@codemirror/view'
import { addColAfter, addColBefore } from './commands/columns'
import { addRowAfter, addRowBefore } from './commands/rows'
import arrowsIcon from './icons/arrows.svg'
import plusIcon from './icons/plus.svg'

/**
* Generates an empty table widget element that represents a Markdown table. To
* fill this element with content, use the updateTable function below.
*
* @return  {HTMLTableElement}  The empty table
*/
export function generateEmptyTableWidgetElement (): { wrapper: HTMLDivElement, table: HTMLTableElement } {
  const table = document.createElement('table')
  const wrapper = document.createElement('div')
  wrapper.classList.add('cm-table-editor-widget-wrapper')
  wrapper.appendChild(table)
  return { table, wrapper }
}

/**
 * Generates the column modification buttons (add left, add right, and the grab
 * handler).
 *
 * @param   {EditorView}     view  The EditorView to trigger the corresponding
 *                                 commands on.
 *
 * @return  {HTMLElement[]}        The list of handlers, need to be attached to
 *                                 the table cell element.
 */
export function generateColumnModifiers (view: EditorView): HTMLElement[] {
  const handler = document.createElement('div')
  handler.classList.add('handler', 'column')
  handler.innerHTML = arrowsIcon

  const addButtonLeft = document.createElement('div')
  addButtonLeft.classList.add('plus', 'left')
  addButtonLeft.innerHTML = plusIcon
  addButtonLeft.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
    addColBefore(view)
  })

  const addButtonRight = document.createElement('div')
  addButtonRight.classList.add('plus', 'right')
  addButtonRight.innerHTML = plusIcon
  addButtonRight.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
    addColAfter(view)
  })

  return [ handler, addButtonLeft, addButtonRight ]
}

/**
 * Generates the row modification buttons (add top, add bottom, and the grab
 * handler).
 *
 * @param   {EditorView}     view  The EditorView to trigger the corresponding
 *                                 commands on.
 *
 * @return  {HTMLElement[]}        The list of handlers, need to be attached to
 *                                 the table cell element.
 */
export function generateRowModifiers (view: EditorView): HTMLElement[] {
  const handler = document.createElement('div')
  handler.classList.add('handler', 'row')
  handler.innerHTML = arrowsIcon

  const addButtonTop = document.createElement('div')
  addButtonTop.classList.add('plus', 'top')
  addButtonTop.innerHTML = plusIcon
  addButtonTop.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
    addRowBefore(view)
  })

  const addButtonBottom = document.createElement('div')
  addButtonBottom.classList.add('plus', 'bottom')
  addButtonBottom.innerHTML = plusIcon
  addButtonBottom.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
    addRowAfter(view)
  })

  return [ handler, addButtonTop, addButtonBottom ]
}
