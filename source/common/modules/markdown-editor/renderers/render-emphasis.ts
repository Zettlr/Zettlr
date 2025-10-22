/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Emphasis renderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     An emphasis renderer. NOTE that this renderer is DIFFERENT
 *                  from the others, in that it will only hide certain ranges.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { type RangeSet, type Range } from '@codemirror/state'
import { EditorView, type ViewUpdate, ViewPlugin, Decoration, type DecorationSet, WidgetType } from '@codemirror/view'
import { rangeInSelection } from '../util/range-in-selection'
import type { SyntaxNode } from '@lezer/common'

class BulletWidget extends WidgetType {
  constructor (readonly node: SyntaxNode) {
    super()
  }

  eq (other: BulletWidget): boolean {
    return other.node.from === this.node.from && other.node.to === this.node.from
  }

  toDOM (_view: EditorView): HTMLElement {
    const elem = document.createElement('span')
    elem.innerHTML = '&bull;'
    elem.classList.add('rendered-bullet')

    return elem
  }
}

export class SpaceWidget extends WidgetType {
  constructor (readonly numChars: number, readonly node?: SyntaxNode) {
    super()
  }

  eq (other: SpaceWidget): boolean {
    if (this.node === undefined || other.node === undefined) {
      return false
    }

    return other.node.from === this.node.from && other.node.to === this.node.from
  }

  toDOM (_view: EditorView): HTMLElement {
    const elem = document.createElement('span')
    elem.innerHTML = '&nbsp;'.repeat(this.numChars)
    elem.classList.add('rendered-space')

    return elem
  }
}

function hideFormattingCharacters (view: EditorView): RangeSet<Decoration> {
  const ranges: Array<Range<Decoration>> = []
  const hiddenDeco = Decoration.replace({})

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter (node) {
        // Do not hide any characters if a selection is inside here
        if (rangeInSelection(view.state, node.from, node.to, true)) {
          return
        }

        if (node.name === 'PandocAttribute') {
          return false // Do not hide the "CodeMarks" of Pandoc attributes
        }

        switch (node.name) {
          case 'Escape':
            // Only hide the actual backslash
            ranges.push(hiddenDeco.range(node.from, node.from + 1))
            break
          // Hide various marks
          case 'Strikethrough': {
            const marks = node.node.getChildren('StrikethroughMark')
            for (const mark of marks) {
              ranges.push(hiddenDeco.range(mark.from, mark.to))
            }
            break
          }
          case 'StrongEmphasis':
          case 'Emphasis': {
            const marks = node.node.getChildren('EmphasisMark')
            for (const mark of marks) {
              ranges.push(hiddenDeco.range(mark.from, mark.to))
            }
            break
          }
          case 'HighlightContent': {
            const marks = node.node.getChildren('HighlightMark')
            for (const mark of marks) {
              ranges.push(hiddenDeco.range(mark.from, mark.to))
            }
            break
          }
          // For fenced code, also hide the CodeInfo
          case 'InlineCode':
          case 'FencedCode': {
            const marks = node.node.getChildren('CodeMark')
            const infos = node.node.getChildren('CodeInfo')
            for (const mark of marks.concat(infos)) {
              ranges.push(hiddenDeco.range(mark.from, mark.to))
            }
            break
          }
          // Hide the square brackets of inline footnotes (keep footnote refs for
          // easier identification)
          case 'Footnote':
          case 'FootnoteRefLabel': {
            const isRef = node.name === 'FootnoteRefLabel'
            ranges.push(hiddenDeco.range(node.from, node.from + 2))
            ranges.push(hiddenDeco.range(node.to - (isRef ? 2 : 1), node.to))
            break
          }
          case 'QuoteMark': {
            // Blockquotes can also be contained within blockquotes, so we try
            // to find the highest parent node.
            let parent: SyntaxNode|null = node.node.parent
            let parentNode
            while (parent) {
              if (parent.name === 'Blockquote') {
                parentNode = parent.node
              }
              parent = parent.parent
            }

            // Only render QuoteMark if the parent does not contain a cursor.
            if (parentNode && rangeInSelection(view.state, parentNode.from, parentNode.to, true)) {
              return
            }

            ranges.push(Decoration.replace({ widget: new SpaceWidget(node.to - node.from, node.node) }).range(node.from, node.to))
            ranges.push(Decoration.line({ class: 'cm-quotemark' }).range(view.state.doc.lineAt(node.from).from))
            break
          }
          case 'ListItem': {
            if (node.node.parent?.name === 'OrderedList') {
              break // We only do this with bullet lists
            }
            const marks = node.node.getChildren('ListMark')
            for (const mark of marks) {
              ranges.push(Decoration.replace({ widget: new BulletWidget(mark.node) }).range(mark.from, mark.to))
            }
            break
          }
        }
      }
    })
  }

  return Decoration.set(ranges, true)
}

const formattingRenderer = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = hideFormattingCharacters(view)
  }

  update (update: ViewUpdate): void {
    this.decorations = hideFormattingCharacters(update.view)
  }
}, {
  decorations: v => v.decorations
})

const formattingCharacterTheme = EditorView.baseTheme({
  '.cm-quotemark': {
    borderLeft: '4px solid',
    opacity: '0.75',
  },
  '.cm-quotemark .rendered-space': {
    display: 'inline-block',
    width: '1ch'
  }
})

export const renderEmphasis = [
  formattingRenderer,
  formattingCharacterTheme
]
