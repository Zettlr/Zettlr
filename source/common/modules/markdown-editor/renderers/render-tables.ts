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
// import clickAndSelect from './click-and-select'
import fromMarkdown from '../table-editor'

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
    const node = this.node
    const table = fromMarkdown(this.table, {
      saveIntent (instance) {
        const newTable = table.getMarkdownTable()
        view.dispatch({
          changes: {
            from: node.from,
            to: node.to,
            insert: newTable.substring(0, newTable.length - 1)
          }
        })

        table.markClean()
      },
      container: view.scrollDOM
    })
    return table.domElement
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
  return new TableWidget(table, node.node)
}

export const renderTables = renderBlockWidgets(shouldHandleNode, createWidget)
