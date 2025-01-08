/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableEditor Widgets
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module holds the graphical representations and
 *                  associated functions for the table editor.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import { WidgetType, EditorView, type DecorationSet, Decoration } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import type { TableRow, Table } from '../../markdown-utils/markdown-ast'
import { parseTableNode } from '../../markdown-utils/markdown-ast/parse-table-node'
import { nodeToHTML } from '../../markdown-utils/markdown-to-html'
import { createSubviewForCell } from './subview'

// DEBUG // TODOs:
// DEBUG // * An empty table is difficult to fill with content because the cells
// DEBUG //   are very small then
// DEBUG // * If someone presses tab, this should bring the selection into the
// DEBUG //   next cell
// DEBUG // * Selections in small/almost empty cells are brittle

// This widget holds a visual DOM representation of a table.
export class TableWidget extends WidgetType {
  constructor (readonly table: string, readonly node: SyntaxNode) {
    super()
  }

  toDOM (view: EditorView): HTMLElement {
    try {
      const table = generateEmptyTableWidgetElement()
      const tableAST = parseTableNode(this.node, view.state.sliceDoc())
      if (tableAST.type !== 'Table') {
        throw new Error('Cannot render table: Likely malformed')
      }
      updateTable(table, tableAST, view)
      return table
    } catch (err: any) {
      console.log('Could not create table', err)
      const error = document.createElement('div')
      error.classList.add('error')
      error.textContent = `Could not render table: ${err.message}`
      return error
    }
  }

  updateDOM (dom: HTMLElement, view: EditorView): boolean {
    // This check allows us to, e.g., create error divs
    if (!(dom instanceof HTMLTableElement)) {
      return false
    }

    const tableAST = parseTableNode(this.node, view.state.sliceDoc())
    if (tableAST.type === 'Table') {
      updateTable(dom, tableAST, view)
      return true
    }

    return false
  }

  destroy (dom: HTMLElement): void {
    // Here we ensure that we completely detach any active subview from the rest
    // of the document so that the garbage collector can remove the subview.
    const cells = [
      ...dom.querySelectorAll('td'),
      ...dom.querySelectorAll('th')
    ]

    for (const cell of cells) {
      const subview = EditorView.findFromDOM(cell)
      if (subview !== null) {
        subview.destroy()
      }
    }
  }

  ignoreEvent (event: Event): boolean {
    return true // In this plugin case, the table should handle everything
  }

  /**
   * Takes an EditorState and returns a DecorationSet containing TableWidgets
   * for each Table node found in the state.
   *
   * @param   {EditorState}    state  The EditorState
   *
   * @return  {DecorationSet}         The DecorationSet
   */
  public static createForState (state: EditorState): DecorationSet {
    const newDecos: Array<Range<Decoration>> = syntaxTree(state)
      // Get all Table nodes in the document
      .topNode.getChildren('Table')
      .filter(table => {
        const ast = parseTableNode(table, state.sliceDoc())
        if (ast.type !== 'Table') {
          return false
        }

        return ast.rows
          .map(r => r.cells.length)
          .every(len => len === (ast.alignment?.length ?? 0))
      })
      // Turn the nodes into Decorations
      .map(node => {
        return Decoration.replace({
          widget: new TableWidget(state.sliceDoc(node.from, node.to), node.node),
          // inclusive: false,
          block: true
        }).range(node.from, node.to)
      })
    return Decoration.set(newDecos)
  }
}

/**
 * Generates an empty table widget element that represents a Markdown table. To
 * fill this element with content, use the updateTable function below.
 *
 * @return  {HTMLTableElement}  The empty table
 */
function generateEmptyTableWidgetElement (): HTMLTableElement {
  const table = document.createElement('table')
  table.classList.add('cm-table-editor-widget')
  return table
}

/**
 * This function takes a DOM-node and a string representing the same Markdown
 * table and ensures that the DOM-node representation conforms to the string.
 *
 * @param  {HTMLTableElement}  table     The DOM-element containing the table
 * @param  {Table}             tableAST  The table AST node
 * @param  {EditorView}        view      The EditorView
 */
function updateTable (table: HTMLTableElement, tableAST: Table, view: EditorView): void {
  const trs = [...table.querySelectorAll('tr')]
  // Remove now-superfluous TRs. The for-loop below accounts for too few.
  while (trs.length > tableAST.rows.length) {
    const tr = trs.pop()!
    tr.parentElement?.removeChild(tr)
  }

  for (let i = 0; i < tableAST.rows.length; i++) {
    const row = tableAST.rows[i]
    if (i === trs.length) {
      // We have to create a new TR
      const tr = document.createElement('tr')
      table.appendChild(tr)
      trs.push(tr)
      updateRow(tr, row, tableAST.alignment, view)
    } else {
      // Transfer the contents
      updateRow(trs[i], row, tableAST.alignment, view)
    }
  }
}

/**
 * This function takes a single table row to update it. This is basically the
 * second level of recursion for those tree structures, but since it is
 * noticeably different from the first level function above, and also the last
 * layer of recursion here, we use a second function for that.
 *
 * @param  {HTMLTableRowElement}  tr      The table row element
 * @param  {TableRow}             astRow  The AST table row element
 * @param  {EditorView}           view    The EditorView
 */
function updateRow (tr: HTMLTableRowElement, astRow: TableRow, align: Array<'left'|'center'|'right'>, view: EditorView): void {
  const tds = [...tr.querySelectorAll(astRow.isHeaderOrFooter ? 'th' : 'td')]
  // Remove now-superfluous TRs. The for-loop below accounts for too few.
  while (tds.length > astRow.cells.length) {
    const td = tds.pop()!
    td.parentElement?.removeChild(td)
  }

  const mainSel = view.state.selection.main

  for (let i = 0; i < astRow.cells.length; i++) {
    const cell = astRow.cells[i]
    // NOTE: This only is true for a selection that is completely contained
    // within a cell. Any overlapping selection will not cause a rendering of
    // the editor view, because selections that cross table cell boundaries are
    // just ... puh.
    const selectionInCell =  mainSel.from >= cell.from && mainSel.to <= cell.to
    if (i === tds.length) {
      // We have to create a new TD
      const td = document.createElement(astRow.isHeaderOrFooter ? 'th' : 'td')
      td.style.textAlign = align[i] ?? 'left'
      // TODO: Enable citation rendering here
      const html = nodeToHTML(cell.children, (_citations, _composite) => undefined, {}, 0).trim()
      td.innerHTML = html.length > 0 ? html : '&nbsp;'
      // NOTE: This handler gets attached once and then remains on the TD for
      // the existence of the table. Since the `view` will always be the same,
      // we only have to save the cellFrom and cellTo to the TDs dataset each
      // time around (see below).
      td.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const from = parseInt(td.dataset.cellFrom ?? '0', 10)
        const cellTo = parseInt(td.dataset.cellTo ?? '0', 10)
        // This code attempts to set the selection as close as possible to the
        // actual character the user has clicked.
        const selection = getSelection()
        const textOffset = selection?.focusOffset ?? 0
        const nodeOffset = estimateNodeOffset(selection?.anchorNode ?? td, td, cell.textContent)
        view.dispatch({ selection: { anchor: Math.min(from + nodeOffset + textOffset, cellTo) } })
      })
      tr.appendChild(td)
      tds.push(td)
    }
    // At this point, there is guaranteed to be an element at i. Now let's check
    // if there's a subview at this cell.

    // Save the corresponding document offsets appropriately
    tds[i].dataset.cellFrom = String(cell.from)
    tds[i].dataset.cellTo = String(cell.to)
    tds[i].style.textAlign = align[i] ?? 'left'

    const subview = EditorView.findFromDOM(tds[i])
    if (subview !== null && !selectionInCell) {
      // The selection was in the cell but isn't any longer -> remove the
      // subview.
      subview.destroy()
    } else if (subview === null && selectionInCell) {
      // Create a new subview to represent the selection here. Ensure the cell
      // itself is empty before we mount the subview.
      tds[i].innerHTML = ''
      createSubviewForCell(view, tds[i], { from: cell.from, to: cell.to })
    } else if (subview === null) {
      // Simply transfer the contents
      // TODO: Enable citation rendering here
      const html = nodeToHTML(cell.children, (_citations, _composite) => undefined, {}, 0).trim()
      tds[i].innerHTML = html.length > 0 ? html : '&nbsp;'
    } // Else: The cell has a subview and the selection is still in there.
  }
}

/**
 * Estimates the offset of the provided `anchorNode` within a table cell element
 * in terms of Markdown source code that may have been used to generate the DOM
 * tree. NOTE: This is merely an estimation, since the function is only used to
 * roughly place the cursor where it should be within the Markdown source. If
 * the substring is unique within `cellContent`, returns the precise beginning
 * of the node's value, so that the value returned from this function plus the
 * selection `focusOffset` are an exact substring (except there are too many
 * spaces in front of this table cell).
 *
 * @param   {Node}                  anchorNode   The clicked node
 * @param   {HTMLTableCellElement}  td           The surrounding TD
 * @param   {string}                cellContent  The Markdown source
 *
 * @return  {number}                             An estimated offset of
 *                                               `anchorNode` within `td`
 */
function estimateNodeOffset (anchorNode: Node, td: HTMLTableCellElement, cellContent: string): number {
  // BUG: Somehow this function returns numbers that are WAY too high, there is
  // still some bug in here. I can reproduce this sometimes in empty cells/an
  // empty table, but I couldn't find a specific pattern yet.
  if (anchorNode === td || anchorNode.parentNode === td) {
    // Clicked node was the target itself, but realistically this doesn't happen
    return 0
  }

  // If the anchorNode is a text node, and the text content of that anchor is
  // unique within the table cell's content, then we can calculate the correct
  // offset and return that one.
  if (anchorNode instanceof Text && anchorNode.nodeValue !== null) {
    const firstIdx = cellContent.indexOf(anchorNode.nodeValue)
    const lastIdx = cellContent.lastIndexOf(anchorNode.nodeValue)

    if (firstIdx > -1 && firstIdx === lastIdx) { // --> Unique substring
      return firstIdx
    }
  }

  // If we're here, the anchor's substring was not unique, so we have to instead
  // use the DOM of the table cell's HTML sub tree to estimate the offset as
  // good as possible.

  let nodeOffset = 0
  // Here we assume that we're somewhere in the td's sub-tree. We'll start
  // navigating node by node backwards until we end up at the td.
  let currentNode = anchorNode
  while (currentNode !== td) {
    if (currentNode.previousSibling !== null ) {
      currentNode = currentNode.previousSibling
    } else if (currentNode.parentNode !== null) {
      currentNode = currentNode.parentNode
      // The parentNode includes all the children we may have already went
      // through so we have to immediately select the previous sibling of it.
      if (currentNode.previousSibling === null) {
        break // Shouldn't happen, but who knows
      } else {
        currentNode = currentNode.previousSibling
      }
    } else {
      break // Something went wrong ...?
    }

    if (currentNode instanceof Text) {
      // Simple text node -> offset increases by its nodeValue
      nodeOffset += currentNode.nodeValue?.length ?? 0
    } else if (currentNode instanceof Element) {
      // Element node --> offset increases by its textContent as well as a rough
      // formatting character estimation
      nodeOffset += currentNode.textContent?.length ?? 0
      nodeOffset += guessFormattingCharsFor(currentNode)
    }
  }

  return nodeOffset
}

/**
 * Takes an HTML element and estimates the possible number of formatting
 * characters needed to generate this HTML from some Markdown code. NOTE: This
 * excludes block elements as it is intended to serve as an estimator for
 * table cells in pipe tables which do not support block elements in their
 * content.
 *
 * @param   {Element}  element  The element to estimate for
 *
 * @return  {number}            A guess of how many formatting characters the
 *                              Markdown source used.
 */
function guessFormattingCharsFor (element: Element): number {
  let chars = 0

  // This function should count anything that is not included in `textContent`

  // Simple inlines
  chars += element.querySelectorAll('strong').length * 4
  chars += element.querySelectorAll('em').length * 2
  chars += element.querySelectorAll('mark').length * 4

  // Links and images have 4/5 formatting characters plus however long the href
  // or src is.
  for (const a of element.querySelectorAll('a')) {
    chars += a.getAttribute('href')?.length ?? 0 + 4
  }
  for (const img of element.querySelectorAll('img')) {
    chars += img.getAttribute('src')?.length ?? 0 + 5
  }

  // NOTE: Headings and other block-level nodes are ignored because they can't
  // occur in pipe tables. We may have to add that functionality later should it
  // turn out that our guesses are way too bad. Because a few block level
  // elements (such as lists etc.) can occur at least in grid tables.

  return chars
}
