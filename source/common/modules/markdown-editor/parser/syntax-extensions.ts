/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Syntax Extensions
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A collection of smaller extensions that style documents
 *                  without modifying the Lezer tree. (Basically overlay modes)
 *
 * END HEADER
 */

import { StateField, type EditorState, type Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'

/**
 * Creates a StateField that applies the class `code` to all code spans. It
 * additionally applies the class `code-block-line` to all lines which are part
 * of an entire code block
 *
 * @return  {StateField}  The StateField
 */
function getCodeHighlighter (): Extension {
  const codeLineDecorator = Decoration.line({ class: 'code code-block-line' })
  const codeSpanDecorator = Decoration.mark({ class: 'code' })

  const render = function (state: EditorState): DecorationSet {
    const widgets: any[] = []

    syntaxTree(state).iterate({
      from: 0,
      to: state.doc.length,
      enter: (node) => {
        // CodeText contains a single node that has all the code's contents
        if (node.type.name === 'CodeText') {
          const start = state.doc.lineAt(node.from).number
          const end = state.doc.lineAt(node.to).number

          for (let lineNo = start; lineNo <= end; lineNo++) {
            const line = state.doc.line(lineNo)
            widgets.push(codeLineDecorator.range(line.from))
          }
        } else if (node.type.name === 'InlineCode') {
          widgets.push(codeSpanDecorator.range(node.from, node.to))
        }
      }
    })

    return Decoration.set(widgets, true)
  }

  const pluginField = StateField.define<DecorationSet>({
    create (state: EditorState) {
      return render(state)
    },
    update (oldDecoSet, transactions) {
      return render(transactions.state)
    },
    provide: f => EditorView.decorations.from(f)
  })
  return pluginField
}

/**
 * Creates a StateField that applies the class `heading` to all heading lines.
 *
 * @return  {StateField}  The StateField
 */
function getHeadingLineHighlighter (): Extension {
  const h1 = Decoration.line({ class: 'size-header-1' })
  const h2 = Decoration.line({ class: 'size-header-2' })
  const h3 = Decoration.line({ class: 'size-header-3' })
  const h4 = Decoration.line({ class: 'size-header-4' })
  const h5 = Decoration.line({ class: 'size-header-5' })
  const h6 = Decoration.line({ class: 'size-header-6' })

  const render = function (state: EditorState): DecorationSet {
    const widgets: any[] = []

    syntaxTree(state).iterate({
      from: 0,
      to: state.doc.length,
      enter: (node) => {
        // We can return "false" to prevent the iterator from descending further
        // into the tree
        if (node.type.name === 'Document') {
          return // Don't return false because headings are children of Document
        }

        if (!node.type.name.startsWith('ATX') && !node.type.name.startsWith('Setext')) {
          return false
        }

        switch (node.type.name) {
          case 'ATXHeading1':
          case 'SetextHeading1':
            widgets.push(h1.range(node.from))
            break
          case 'ATXHeading2':
          case 'SetextHeading2':
            widgets.push(h2.range(node.from))
            break
          case 'ATXHeading3':
            widgets.push(h3.range(node.from))
            break
          case 'ATXHeading4':
            widgets.push(h4.range(node.from))
            break
          case 'ATXHeading5':
            widgets.push(h5.range(node.from))
            break
          case 'ATXHeading6':
            widgets.push(h6.range(node.from))
        }
      }
    })

    return Decoration.set(widgets)
  }

  const pluginField = StateField.define<DecorationSet>({
    create (state: EditorState) {
      return render(state)
    },
    update (oldDecoSet, transactions) {
      return render(transactions.state)
    },
    provide: f => EditorView.decorations.from(f)
  })
  return pluginField
}

/**
 * An array of syntax extensions for Markdown documents (i.e. please do not use
 * for code files).
 *
 * @return  {Extension}  An extension for the markdown editor
 */
export const syntaxExtensions = [
  getCodeHighlighter(),
  getHeadingLineHighlighter(),
  EditorView.baseTheme({
    '.size-header-1': { fontWeight: 'bold' },
    '.size-header-2': { fontWeight: 'bold' },
    '.size-header-3': { fontWeight: 'bold' },
    '.size-header-4': { fontWeight: 'bold' },
    '.size-header-5': { fontWeight: 'bold' },
    '.size-header-6': { fontWeight: 'bold' }
  })
]
