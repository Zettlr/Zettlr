/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Utilizing the TableEditor, this renderer renders tables.
 *
 * END HEADER
 */

import { renderBlockWidgets } from './base-renderer'
import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState, StateEffect } from '@codemirror/state'
import clickAndSelect from './click-and-select'
import { parseTableNode } from '../../markdown-utils/markdown-ast/parse-table-node'
import { type Table } from '../../markdown-utils/markdown-ast'

// TODO: https://codemirror.net/examples/split/
// This is how I should do this: Overwrite the main view's dispatch method.

function makeCellEditable (td: HTMLTableCellElement, view: EditorView): void {
  // TODO: Add a small extension to the original view that listens to updates
  const cellUpdater = EditorView.updateListener.of((u) => {
    console.log('Received update from main editor', u)
  })
  // TODO: Check whether that particular view already has the updater, and if it
  // does, simply hook into that one so that each view has one update listener
  // that all table cells managed by this plugin have access to.
  const c = StateEffect.appendConfig.of(cellUpdater)
  view.dispatch({ effects: c })

  const cb = (event: MouseEvent) => {
    if (td.textContent === null) {
      return
    }
    const state = EditorState.create({
      // TODO: Find the substring this cell contains in the original view
      doc: td.textContent
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const view = new EditorView({ state, parent: td })
    // TODO: Apply all changes NOT here, but to the ORIGINAL view. Then, make
    // sure that any changes to the original view are applied here automagically
    // (including those that don't pertain to this partial view so that everything
    // is in sync).

    // Remove callback again
    td.removeEventListener('click', cb)
  }
  // Register a callback that will mount a CM editor onto the table cell
  td.addEventListener('click', cb)
}

function updateTable (table: HTMLTableElement, tableAST: Table, view: EditorView): void {
  const thead = table.querySelector('thead') ?? document.createElement('thead')
  const tbody = table.querySelector('tbody') ?? document.createElement('tbody')

  // TODO: Better update mechanism that actually only updates what exactly has changed
  thead.innerHTML = ''
  tbody.innerHTML = ''

  for (const row of tableAST.rows) {
    const tr = document.createElement('tr')
    if (row.isHeaderOrFooter) {
      thead.appendChild(tr)
    } else {
      tbody.appendChild(tr)
    }

    for (const cell of row.cells) {
      const td = document.createElement(row.isHeaderOrFooter ? 'th' : 'td')
      td.textContent = view.state.sliceDoc(cell.from, cell.to)
      // DEBUG: Move to proper styles
      td.style.border = '1px solid black'
      tr.appendChild(td)
      makeCellEditable(td, view)
    }
  }

  if (table.querySelector('thead') === null && thead.childNodes.length > 0) {
    table.appendChild(thead)
  }

  if (table.querySelector('tbody') === null) {
    table.appendChild(tbody)
  }
}

class TableWidget extends WidgetType {
  constructor (readonly table: string, readonly node: SyntaxNode) {
    super()
  }

  eq (other: TableWidget): boolean {
    // console.log('Equating two table widgets')
    return this.table === other.table &&
      this.node.from === other.node.from &&
      this.node.to === other.node.to
  }

  toDOM (view: EditorView): HTMLElement {
    // console.log('Generating table element')
    try {
      const table = document.createElement('table')
      // DEBUG: Move to proper styles
      table.style.borderCollapse = 'collapse'
      const ast = parseTableNode(this.node, view.state.sliceDoc(this.node.from, this.node.to))
      if (ast.type !== 'Table') {
        throw new Error('Could not render table: Likely malformed')
      }
      updateTable(table, ast, view)
      return table
    } catch (err: any) {
      console.log('Could not create table', err)
      const error = document.createElement('div')
      error.classList.add('error')
      error.textContent = `Could not render table: ${err.message}`
      error.addEventListener('click', () => clickAndSelect(view))
      return error
    }
  }

  updateDOM (dom: HTMLElement, view: EditorView): boolean {
    console.log('Attempting DOM update')
    try {
      const ast = parseTableNode(this.node, view.state.sliceDoc(this.node.from, this.node.to))
      if (ast.type !== 'Table') {
        throw new Error('Could not update widget: Table was malformed.')
      }
      updateTable(dom as HTMLTableElement, ast, view)
      return true
    } catch (err: any) {
      console.error('Could not update DOM', err)
      return false
    }
  }

  ignoreEvent (event: Event): boolean {
    return true // In this plugin case, the table should handle everything
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return node.type.name === 'Table'
}

function createWidget (state: EditorState, node: SyntaxNodeRef): TableWidget|undefined {
  const table = state.sliceDoc(node.from, node.to)
  // Attempt to parse the table node immediately, because here is the last point
  // where we can simply return "undefined" to keep the table untouched and thus
  // user editable, if there is anything that prevents Zettlr from parsing the
  // table.
  try {
    return new TableWidget(table, node.node)
  } catch (err: any) {
    err.message = 'Could not instantiate TableEditor widget: ' + err.message
    console.error(err)
    return undefined
  }
}

export const renderTables = renderBlockWidgets(shouldHandleNode, createWidget)
