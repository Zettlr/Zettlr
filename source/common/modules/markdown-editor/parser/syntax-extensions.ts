// According to Marijn [here](https://discuss.codemirror.net/t/extend-overlay-mode/2818/4),
// we can define additional syntax as a plugin (as opposed to an overlay mode)

import { StateField, EditorState, Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { MatchDecorator, ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'
import { configField } from '../util/configuration'

/**
 * The inline decorator is a ViewPlugin that adds a few inline highlight styles
 * such as for citations, tags, and highlights. It does so utilizing a
 * MatchDecorator.
 *
 * @return  {ViewPlugin}  The instantiated plugin
 */
function getInlineDecorator (): Extension {
  // First, we need to define the decorations we would like to add
  const citationDeco = Decoration.mark({ class: 'cm-citation' })
  const tagDeco = Decoration.mark({ class: 'cm-zkn-tag' })
  const highlightDeco = Decoration.mark({ class: 'cm-highlight' })
  const headingDeco = Decoration.mark({ class: 'cm-formatting-header' })

  // Next, we need a so-called MatchDecorator that parses the code and returns a
  // decoration that should apply to those matches
  const decorator = new MatchDecorator({
    regexp: /(@\w+)|(::.*?::)|(^#{1,6}\s+)|(?<=^|\s|[({[])#(#?[^\s,.:;…!?"'`»«“”‘’—–@$%&*#^+~÷\\/|<=>[\](){}]+#?)/ug,
    decoration: m => {
      if (m[1] !== undefined) {
        return citationDeco
      } else if (m[2] !== undefined) {
        return highlightDeco
      } else if (m[3] !== undefined) {
        return headingDeco
      } else {
        return tagDeco
      }
    }
  })

  // Lastly, we define a view plugin (because we're just messing with styles here)
  // that binds our own decorator to the given view (decorator.createDeco) and then
  // runs the decorator on every update.
  return ViewPlugin.define(view => ({
    decorations: decorator.createDeco(view),
    update (u: ViewUpdate) {
      this.decorations = decorator.updateDeco(u, this.decorations)
    }
  }), {
    decorations: v => v.decorations
  })
}

/**
 * Creates a StateField that applies the class `code` to all code block lines.
 *
 * @return  {StateField}  The StateField
 */
function getCodeBlockLineHighlighter (): Extension {
  const codeLineDecorator = Decoration.line({ class: 'code code-block-line' })
  const codeBlockStart = Decoration.line({ class: 'code-block-first-line' })
  const codeBlockEnd = Decoration.line({ class: 'code-block-last-line' })

  const render = function (state: EditorState): DecorationSet {
    const widgets: any[] = []

    syntaxTree(state).iterate({
      from: 0,
      to: state.doc.length,
      enter: (node) => {
        // CodeText contains a single node that has all the code's contents
        if (node.type.name !== 'CodeText') {
          return
        }

        const start = state.doc.lineAt(node.from).number
        const end = state.doc.lineAt(node.to).number

        widgets.push(codeBlockStart.range(state.doc.line(start).from))

        for (let lineNo = start; lineNo <= end; lineNo++) {
          const line = state.doc.line(lineNo)
          widgets.push(codeLineDecorator.range(line.from))
        }

        widgets.push(codeBlockEnd.range(state.doc.line(end).from))
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
 * Creates a StateField that highlights Zkn-links
 *
 * @return  {StateField}  The StateField
 */
function getZknLinkHighlighter (): Extension {
  const deco = Decoration.mark({ class: 'cm-zkn-link' })

  const render = function (state: EditorState): DecorationSet {
    const widgets: any[] = []

    const { linkStart, linkEnd } = state.field(configField)

    syntaxTree(state).iterate({
      from: 0,
      to: state.doc.length,
      enter: (node) => {
        // We can return "false" to prevent the iterator from descending further
        // into the tree
        if (node.type.name === 'Document') {
          return // Don't return false because headings are children of Document
        }

        if (node.type.name === 'FencedCode') {
          return false
        }

        const nodeContents = state.sliceDoc(node.from, node.to)

        let idx = 0
        while (nodeContents.includes(linkStart, idx)) {
          const start = nodeContents.indexOf(linkStart, idx)
          const end = nodeContents.indexOf(linkEnd, start + linkStart.length)
          if (end < 0) {
            break // This link is not closing on this line
          }

          idx = end + linkStart.length
          widgets.push(deco.range(node.from + start, node.from + idx))
        }

        return false // Do not descend further
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
  getInlineDecorator(),
  getCodeBlockLineHighlighter(),
  getHeadingLineHighlighter(),
  getZknLinkHighlighter()
]
