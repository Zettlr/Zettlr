import { type EditorView } from '@codemirror/view'
import { addColAfter, addColBefore } from './commands/columns'
import { addRowAfter, addRowBefore } from './commands/rows'
import arrowsIcon from './icons/arrows.svg'
import plusIcon from './icons/plus.svg'

/**
 * This is the primary class applied to the table editor widget wrappers. This
 * allows easy identification of the rendered table widgets where necessary.
 *
 * @var {string}
 */
export const TABLE_WIDGET_WRAPPER_CLASS = 'cm-table-editor-widget-wrapper'

/**
* Generates an empty table widget element that represents a Markdown table. To
* fill this element with content, use the updateTable function below.
*
* @return  {HTMLTableElement}  The empty table
*/
export function generateEmptyTableWidgetElement (): { wrapper: HTMLDivElement, table: HTMLTableElement } {
  const table = document.createElement('table')
  const wrapper = document.createElement('div')
  wrapper.classList.add(TABLE_WIDGET_WRAPPER_CLASS)
  wrapper.appendChild(table)
  return { table, wrapper }
}

export function tableTR (): HTMLTableRowElement {
  return document.createElement('tr')
}

export function tableTD (): HTMLTableCellElement {
  return document.createElement('td')
}

export function tableTH (): HTMLTableCellElement {
  return document.createElement('th')
}

/**
 * Generates the column modification buttons (add left, add right, and the grab
 * handle).
 *
 * @param   {EditorView}     view  The EditorView to trigger the corresponding
 *                                 commands on.
 *
 * @return  {HTMLElement[]}        The list of handles, need to be attached to
 *                                 the table cell element.
 */
export function generateColumnControls (view: EditorView): HTMLElement[] {
  const grabHandle = document.createElement('div')
  grabHandle.classList.add('grab-handle', 'column')
  grabHandle.innerHTML = arrowsIcon

  const addButtonLeft = document.createElement('div')
  addButtonLeft.classList.add('plus', 'left')
  addButtonLeft.innerHTML = plusIcon
  addButtonLeft.addEventListener('mousedown', event => {
    event.stopPropagation()
    addColBefore(view)
  })

  const addButtonRight = document.createElement('div')
  addButtonRight.classList.add('plus', 'right')
  addButtonRight.innerHTML = plusIcon
  addButtonRight.addEventListener('mousedown', event => {
    event.stopPropagation()
    addColAfter(view)
  })

  return [ grabHandle, addButtonLeft, addButtonRight ]
}

/**
 * Generates the row modification buttons (add top, add bottom, and the grab
 * handle).
 *
 * @param   {EditorView}     view  The EditorView to trigger the corresponding
 *                                 commands on.
 *
 * @return  {HTMLElement[]}        The list of handles, need to be attached to
 *                                 the table cell element.
 */
export function generateRowControls (view: EditorView): HTMLElement[] {
  const grabHandle = document.createElement('div')
  grabHandle.classList.add('grab-handle', 'row')
  grabHandle.innerHTML = arrowsIcon

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

  return [ grabHandle, addButtonTop, addButtonBottom ]
}
