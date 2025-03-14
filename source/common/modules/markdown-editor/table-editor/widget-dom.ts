import { type EditorView } from '@codemirror/view'
import { addColAfter, addColBefore } from './commands/columns'
import { addRowAfter, addRowBefore } from './commands/rows'

const arrowsIcon = `<svg width="20" height="15" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 0C3.35786 0 0 3.35786 0 7.5C0 11.6421 3.35786 15 7.5 15H12.5C16.6421 15 20 11.6421 20 7.5C20 3.35786 16.6421 0 12.5 0H7.5ZM12 4.48012C12 4.27787 12.2276 4.15933 12.3933 4.27531L16.7074 7.29515C16.8496 7.39467 16.8496 7.60524 16.7074 7.70476L12.3933 10.7246C12.2276 10.8406 12 10.722 12 10.5198V4.48012ZM7.99998 4.48013C7.99998 4.27787 7.77231 4.15933 7.60662 4.27532L3.29257 7.29516C3.15039 7.39468 3.15039 7.60525 3.29257 7.70477L7.60662 10.7246C7.77231 10.8406 7.99998 10.7221 7.99998 10.5198V4.48013Z" fill="#6B6B6B"/>
</svg>`

const plusIcon = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 0C3.35786 0 0 3.35786 0 7.5C0 11.6421 3.35786 15 7.5 15C11.6421 15 15 11.6421 15 7.5C15 3.35786 11.6421 0 7.5 0ZM6.5 3.5C6.5 3.22386 6.72386 3 7 3H8C8.27614 3 8.5 3.22386 8.5 3.5V6.5H11.5C11.7761 6.5 12 6.72386 12 7V8C12 8.27614 11.7761 8.5 11.5 8.5H8.5V11.5C8.5 11.7761 8.27614 12 8 12H7C6.72386 12 6.5 11.7761 6.5 11.5V8.5H3.5C3.22386 8.5 3 8.27614 3 8V7C3 6.72386 3.22386 6.5 3.5 6.5L6.5 6.5V3.5Z" fill="#6B6B6B"/>
</svg>`

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
    addColAfter(view)
  })

  const addButtonRight = document.createElement('div')
  addButtonRight.classList.add('plus', 'right')
  addButtonRight.innerHTML = plusIcon
  addButtonRight.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
    addColBefore(view)
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
