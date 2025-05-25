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
import { WidgetType, type EditorView } from '@codemirror/view'
import { type EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'
import { fromSyntaxNode } from '../table-editor'

class TableWidget extends WidgetType {
  constructor (readonly table: string, readonly node: SyntaxNode) {
    super()
  }

  eq (other: TableWidget): boolean {
    return this.table === other.table &&
      this.node.from === other.node.from &&
      this.node.to === other.node.to
  }

  toDOM (view: EditorView): HTMLElement {
    try {
      const node = this.node
      const table = fromSyntaxNode(this.node, view.state.sliceDoc(), {
        saveIntent () {
          view.dispatch({
            changes: {
              from: node.from,
              to: node.to,
              insert: table.getMarkdownTable()
            }
          })

          table.markClean()
        },
        container: view.scrollDOM
      })
      return table.domElement
    } catch (err: any) {
      const error = document.createElement('div')
      error.classList.add('error')
      error.textContent = `Could not render table: ${err.message}`
      error.addEventListener('click', () => clickAndSelect(view))
      return error
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
    fromSyntaxNode(node.node, state.sliceDoc())
    return new TableWidget(table, node.node)
  } catch (err: any) {
    err.message = 'Could not instantiate TableEditor widget: ' + err.message
    console.error(err)
    return undefined
  }
}

export const renderTables = renderBlockWidgets(shouldHandleNode, createWidget)
