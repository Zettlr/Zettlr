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
import type { Rect, DecorationSet } from '@codemirror/view'
import { WidgetType, EditorView, Decoration } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import type { TableRow, Table, TableCell } from '../../markdown-utils/markdown-ast'
import { parseTableNode } from '../../markdown-utils/markdown-ast/parse-table-node'
import { nodeToHTML } from '../../markdown-utils/markdown-to-html'
import { createSubviewForCell, hiddenSpanField } from './subview'
import { getCoordinatesForRange } from './commands/util'
import { generateColumnControls, generateEmptyTableWidgetElement, generateRowControls, tableTD, tableTH, tableTR } from './widget-dom'
import { displayTableContextMenu } from './context-menu'
import { addColAfter, addColBefore, clearCol, deleteCol, swapNextCol, swapPrevCol } from './commands/columns'
import { addRowAfter, addRowBefore, clearRow, deleteRow, swapNextRow, swapPrevRow } from './commands/rows'
import { clearTable, setAlignment } from './commands/tables'
import { CITEPROC_MAIN_DB } from 'source/types/common/citeproc'
import { configField } from '../util/configuration'

// This widget holds a visual DOM representation of a table.
export class TableWidget extends WidgetType {
  // TODO: This number is literally only what I have here right now. So for
  // other people -- especially with other themes, different zoom levels, etc.,
  // this value will be off. The more off this is, the worse the scroll jumping
  // will become. I will have to modify the table widgets to use a ViewPlugin
  // instead of the current StateField so that I gain access to the view and can
  // provide more reliable methods of measuring the average table row height.
  private readonly meanRowHeight = 35
  constructor (readonly table: string, readonly node: SyntaxNode) {
    super()
  }

  // Okay, this is wild. So, this getter (plus the `coordsAt` overwrite below)
  // fixes the scroll-jumping issue that many users (incl. me) have experienced
  // and reported. It turns out that Codemirror really relies on estimates from
  // the widgets ESPECIALLY for large block ones like tables. If you don't give
  // it an estimated height (again, does not need to be pixel perfect), it will
  // apparently assume a zero height for calculating viewpoint positions. This
  // will cause scroll jumps, because Codemirror does not know how much space
  // our widget takes up. With even a rough estimate, Codemirror will jump just
  // a little bit the first time you select inside a cell (depending, of course,
  // on how wrong this estimate is), but then it will actually measure it and no
  // more jumping occurs. "Why does the jumping continue if we just don't
  // provide an estimate here?" you may ask now. Well, as far as I'm concerned,
  // I believe if the actual cursor position jumps out of the viewport,
  // Codemirror will re-calculate everything once you're back at the correct
  // position, because you changed the viewport, and only if not you but
  // Codemirror changed the viewport will it believe (itself). Anyways, now it
  // works -- much better than before.
  get estimatedHeight (): number {
    const tableAST = parseTableNode(this.node, this.table)
    if (tableAST.type !== 'Table') {
      return -1
    }

    // We base our height estimate off the mean row height.
    return tableAST.rows.length * this.meanRowHeight
  }

  toDOM (view: EditorView): HTMLElement {
    try {
      const { wrapper, table } = generateEmptyTableWidgetElement()
      const tableAST = parseTableNode(this.node, view.state.sliceDoc())
      if (tableAST.type !== 'Table') {
        throw new Error('Cannot render table: Likely malformed')
      }
      updateTable(table, tableAST, view)
      view.requestMeasure()
      return wrapper
    } catch (err: any) {
      console.log('Could not create table', err)
      const error = document.createElement('div')
      error.classList.add('error')
      error.textContent = `Could not render table: ${err.message}`
      return error
    }
  }

  updateDOM (dom: HTMLElement, view: EditorView): boolean {
    // `dom` is the widget wrapper.
    const table: HTMLTableElement|null = dom.querySelector('table')

    // This check allows us to, e.g., create error divs
    if (table === null) {
      return false
    }

    const tableAST = parseTableNode(this.node, view.state.sliceDoc())
    if (tableAST.type === 'Table') {
      const height = table.getBoundingClientRect().height
      updateTable(table, tableAST, view)
      // Instruct the editor to remeasure its height; see
      // https://discuss.codemirror.net/t/5604
      if (height !== table.getBoundingClientRect().height) {
        view.requestMeasure()
      }
      return true
    }

    return false
  }

  destroy (dom: HTMLElement): void {
    // Here we ensure that we completely detach any active subview from the rest
    // of the document so that the garbage collector can remove the subview.
    // NOTE that all content, including the subviews, are mounted into a content
    // wrapper DIV element within the table cell elements.
    const cells = [...dom.querySelectorAll<HTMLDivElement>('div.content')]

    for (const cell of cells) {
      const subview = EditorView.findFromDOM(cell)
      if (subview !== null) {
        subview.destroy()
      }
    }
  }

  // This is the second secret to preventing scroll jumping-issues: Give
  // Codemirror approximate pixel positions of a position its requesting within
  // the table widget.
  coordsAt (dom: HTMLElement, pos: number, _side: number): Rect | null {
    // We use this helper function to help Codemirror determine the exact, pixel
    // perfect position of a given position inside our table so that it can
    // correctly calculate viewpoint positions where necessary.
    const cells = [...dom.querySelectorAll<HTMLDivElement>('td, th')]
      .map(cell => {
        return {
          td: cell,
          from: parseInt(cell.dataset.cellFrom!, 10),
          to: parseInt(cell.dataset.cellTo!, 10)
        }
      })
    
    const realPos = pos + this.node.from // NOTE that `pos` is only an offset.

    // NOTE: This code ignores the "side" parameter. Also, it ignores the offset
    // into the table cell itself.
    for (const cell of cells) {
      const { from, to, td } = cell
      if ((from <= realPos && to >= realPos) || realPos < from) {
        // Found it: The pos is somewhere within this cell, or it was after the
        // previous cell (but before this one), or in the leading formatting
        // characters of the table. In any case, report back the correct pixel
        // position of this cell
        const content = td.querySelector('.content')
        if (content !== null) {
          // Found via https://github.com/codemirror/view/blob/45268f0eb62d1c6a0d70952ebdeb2e5ac898109d/src/dom.ts#L89
          // This seems to improve the situation marginally.
          const { left, top, bottom } = content.getBoundingClientRect()
          return { left, right: left, top, bottom }
        } else {
          console.warn('[TableEditor] Cannot provide accurate client rect: no `.content`-element found in table cell.')
          return td.getBoundingClientRect()
        }
      }
    }

    // Not found in the table -> fall back to the rect of the entire table
    return dom.getBoundingClientRect()
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
          return false // There was an error in parsing the table
        }

        if (ast.tableType === 'grid') {
          // The TableEditor cannot support grid tables, since they can have
          // (a) colspans and rowspans, and (b) multiple lines, which is just
          // too difficult to represent using our approach here. (Also, grids
          // are much easier to parse visually than pipes and less common,
          // reducing the need for us to support them.)
          return false
        }

        // Finally, check that the table is proper.
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
 * This function takes a DOM-node and a string representing the same Markdown
 * table and ensures that the DOM-node representation conforms to the string.
 *
 * @param  {HTMLTableElement}  table     The DOM-element containing the table
 * @param  {Table}             tableAST  The table AST node
 * @param  {EditorView}        view      The EditorView
 */
function updateTable (table: HTMLTableElement, tableAST: Table, view: EditorView): void {
  // Before we get started in updating the table, we need to find and remove all
  // handle elements we have in the table. They will be re-inserted in the
  // updateRow function calls below.
  table.querySelectorAll('div.grab-handle').forEach(handle => handle.parentElement!.removeChild(handle))
  table.querySelectorAll('div.plus').forEach(plus => plus.parentElement!.removeChild(plus))

  const trs = [...table.querySelectorAll('tr')]
  const rowsChanged = trs.length !== tableAST.rows.length
  // Remove now-superfluous TRs. The for-loop below accounts for too few.
  while (trs.length > tableAST.rows.length) {
    const tr = trs.pop()!
    tr.parentElement?.removeChild(tr)
  }

  const coords = getCoordinatesForRange(view.state.selection.main, tableAST)

  for (let i = 0; i < tableAST.rows.length; i++) {
    const row = tableAST.rows[i]
    if (i === trs.length) {
      // We have to create a new TR
      const tr = tableTR()
      table.appendChild(tr)
      trs.push(tr)
    }
    // Transfer the contents
    updateRow(trs[i], row, i, tableAST.alignment, view, rowsChanged, coords)
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
 * @param  {number}               idx     The row's index in the table
 * @param  {EditorView}           view    The EditorView
 */
function updateRow (
  tr: HTMLTableRowElement,
  astRow: TableRow,
  idx: number,
  align: Array<'left'|'center'|'right'|null>,
  view: EditorView,
  rowsChanged: boolean,
  selectionCoords?: { col: number, row: number },
): void {
  const tds = [...tr.querySelectorAll(astRow.isHeaderOrFooter ? 'th' : 'td')]
  const columnsChanged = tds.length !== astRow.cells.length
  // Remove now-superfluous TRs. The for-loop below accounts for too few.
  while (tds.length > astRow.cells.length) {
    const td = tds.pop()!
    td.parentElement?.removeChild(td)
  }

  const { row, col } = selectionCoords !== undefined ? selectionCoords : { row: -1, col: -1 }

  for (let i = 0; i < astRow.cells.length; i++) {
    const cell = astRow.cells[i]
    const selectionInCell = row === idx && col === i
    if (i === tds.length) {
      // We have to create a new TD
      const td = astRow.isHeaderOrFooter ? tableTH() : tableTD()

      // TODO: Enable citation rendering here
      const contentWrapper = document.createElement('div')
      contentWrapper.classList.add('content')
      td.appendChild(contentWrapper)
      const html = nodeToHTML(cell.children, (_citations, _composite) => undefined, {}, 0).trim()
      contentWrapper.innerHTML = html.length > 0 ? html : '&nbsp;'

      // NOTE: This handle gets attached once and then remains on the TD for
      // the existence of the table. Since the `view` will always be the same,
      // we only have to save the cellFrom and cellTo to the TDs dataset each
      // time around (see below).
      td.addEventListener('mousedown', (e) => {
        if (contentWrapper.classList.contains('editing')) {
          // There is already a subview inside this cell to handle selections.
          return
        }

        e.preventDefault()
        e.stopPropagation()
        setSelectionToCell(td, cell, view)
      })

      td.addEventListener('contextmenu', (event) => {
        const ctxEvent = event instanceof PointerEvent && event.button === 2
        if (!ctxEvent) {
          return
        }

        setSelectionToCell(td, cell, view)

        displayTableContextMenu(event, clickedID => {
          switch (clickedID) {
            case 'insert.row.above':
              addRowBefore(view)
              break
            case 'insert.row.below':
              addRowAfter(view)
              break
            case 'insert.col.right':
              addColAfter(view)
              break
            case 'insert.col.left':
              addColBefore(view)
              break
            case 'move.row.up':
              swapPrevRow(view)
              break
            case 'move.row.down':
              swapNextRow(view)
              break
            case 'move.col.left':
              swapPrevCol(view)
              break
            case 'move.col.right':
              swapNextCol(view)
              break
            case 'align.col.left':
              setAlignment('left')(view)
              break
            case 'align.col.center':
              setAlignment('center')(view)
              break
            case 'align.col.right':
              setAlignment('right')(view)
              break
            case 'clear.row':
              clearRow(view)
              break
            case 'clear.col':
              clearCol(view)
              break
            case 'clear.table':
              clearTable(view)
              break
            case 'delete.row':
              deleteRow(view)
              break
            case 'delete.col':
              deleteCol(view)
              break
          }
        })
      })

      tr.appendChild(td)
      tds.push(td)
    }

    // At this point, there is guaranteed to be an element at i. We need to do
    // // two update operations here. First, insert handles to first row/col
    // cells, and second verify if we have to simply transfer the contents, or
    // add/remove a subview in this cell based on selection.
    if (idx === 0 && col === i) {
      // Selection is in this column
      for (const elem of generateColumnControls(view)) {
        tds[i].appendChild(elem)
      }
    }

    if (i === 0 && row === idx) {
      // Selection is in this row
      for (const elem of generateRowControls(view)) {
        tds[i].appendChild(elem)
      }
    }

    // Save the corresponding document offsets appropriately. NOTE that we
    // include whitespace here (minus one space padding if applicable).
    tds[i].dataset.cellFrom = String(cell.from)
    tds[i].dataset.cellTo = String(cell.to)
    tds[i].style.textAlign = align[i] ?? ''

    const contentWrapper: HTMLDivElement = tds[i].querySelector('div.content')!
    const subview = EditorView.findFromDOM(contentWrapper)

    const [ subviewFrom, subviewTo ] = subview?.state.field(hiddenSpanField).cellRange ?? [ -1, -1 ]

    const config = view.state.field(configField).metadata.library
    const library = config === '' ? CITEPROC_MAIN_DB : config
    const callback = window.getCitationCallback(library)

    if (subview !== null && !selectionInCell) {
      subview.destroy()
      contentWrapper.classList.remove('editing')
      const html = nodeToHTML(cell.children, callback, {}, 0).trim()
      contentWrapper.innerHTML = html.length > 0 ? html : '&nbsp;'
    } else if (subview === null && selectionInCell) {
      // Before we mount a subview, we need to normalize the selection if
      // necessary. The table commands are allowed to place the new selection
      // anywhere inside the table cell delimiters, and this will make
      // `selectionInCell` turn `true` because that only checks if we are
      // anywhere between the table cell delimiters. However, especially when
      // the selection is inside an empty cell with more than two spaces, it is
      // entirely arbitrary where the (synthetic) content span will end up.
      // Our AST parser will just decide on something, so before this point we
      // actually don't know if the selection will literally end up where the
      // AST has placed the cell content span. But that is important, because
      // that is where the subview will place the editable span of the cell. If
      // the selection is inside the table cell delimiters, but outside of what
      // the AST considers "content," this will lead to weird transactions that
      // won't pass either the transaction filter of the subview, or, worse, add
      // the inserted characters at completely arbitrary positions of the table.
      // So, here we enforce that the main selection is definitely somewhere
      // inside the table cell *content*.
      const sel = view.state.selection.main
      let newFrom = Math.max(sel.from, cell.from)
      newFrom = Math.min(newFrom, cell.to)
      let newTo = Math.max(sel.to, cell.from)
      newTo = Math.min(newTo, cell.to)

      // NOTE: This entire code runs during updates (since that's when the
      // widget's updateDOM function will be called), so we must wait until that
      // update is complete before we do anything.
      requestAnimationFrame(() => {
        if (newFrom !== sel.from || newTo !== sel.to) {
          view.dispatch({ selection: { anchor: newFrom, head: newTo } })
        }

        // Create a new subview to represent the selection here. Ensure the cell
        // itself is empty before we mount the subview.
        contentWrapper.innerHTML = ''
        createSubviewForCell(view, contentWrapper, { from: cell.from, to: cell.to })
        contentWrapper.classList.add('editing')
      })
    } else if (subview === null) {
      // Simply transfer the contents
      const html = nodeToHTML(cell.children, callback, {}, 0).trim()
      if (html !== contentWrapper.innerHTML) {
        contentWrapper.innerHTML = html.length > 0 ? html : '&nbsp;'
      }
    } else if ((subviewFrom !== cell.from || subviewTo !== cell.to) && (columnsChanged || rowsChanged)) {
      // Here, there is a subview in the cell and the selection is in this cell,
      // but the subview has been "carried over" from a different column or row,
      // which happens if the user adds or removes columns or rows. In this case
      // we basically have to remove and recreate the subview, to ensure it
      // grabs the correct cell's information.
      // NOTE: This is a potential point of failure. `cell.from` and `cell.to`
      // may not correspond to the subview range, since the user can insert
      // spaces which the parser will not consider part of the cell. This is why
      // we also check for whether the amount of columns or rows has changed.
      // This is usually a good indicator that the subview may contain an
      // outdated cell view.
      subview.destroy()
      createSubviewForCell(view, contentWrapper, { from: cell.from, to: cell.to })
    } // Else: The cell has a subview and the selection is still in there.
  }
}

/**
 * Sets the selection into a targeted cell in preparation for instantiating a
 * table editor here. This utility function attempts to set the cursor position
 * as close as possible to the actual mouse cursor click coordinates.
 *
 * @param   {HTMLTableCellElement}  td    The table cell element
 * @param   {TableCell}             cell  The table cell contents
 * @param   {EditorView}            view  The editor view
 */
function setSelectionToCell (td: HTMLTableCellElement, cell: TableCell, view: EditorView): void {
  const from = parseInt(td.dataset.cellFrom ?? '0', 10)
  const cellTo = parseInt(td.dataset.cellTo ?? '0', 10)
  const selection = getSelection()
  const textOffset = selection?.focusOffset ?? 0
  const nodeOffset = estimateNodeOffset(selection?.anchorNode ?? td, td, cell.textContent)
  view.dispatch({ selection: { anchor: Math.min(from + nodeOffset + textOffset, cellTo) } })
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
