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
import { type ViewUpdate, type EditorView, ViewPlugin, Decoration, type DecorationSet, WidgetType } from '@codemirror/view'
import { rangeInSelection } from '../util/range-in-selection'
import type { SyntaxNode } from '@lezer/common'

class BulletWidget extends WidgetType {
  constructor (readonly node: SyntaxNode) {
    super()
  }

  eq (other: BulletWidget): boolean {
    return other.node.from === this.node.from && other.node.to === this.node.from
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('span')
    elem.innerHTML = '&bull;'
    elem.classList.add('rendered-bullet')
    return elem
  }
}

class SpaceWidget extends WidgetType {
  constructor (readonly node: SyntaxNode, readonly numChars: number) {
    super()
  }

  eq (other: BulletWidget): boolean {
    return other.node.from === this.node.from && other.node.to === this.node.from
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('span')
    elem.innerHTML = '&nbsp;'.repeat(this.numChars)
    elem.style.fontFamily = 'monospace'
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
        if (rangeInSelection(view.state, node.from, node.to)) {
          return
        }
        console.log(node.name)

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
          case 'Highlight': {
            ranges.push(hiddenDeco.range(node.from, node.from + 2))
            ranges.push(hiddenDeco.range(node.to - 2, node.to))
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
          case 'Footnote': {
            ranges.push(hiddenDeco.range(node.from, node.from + 2))
            ranges.push(hiddenDeco.range(node.to - 1, node.to))
            break
          }
          case 'Blockquote': {
            const mark = node.node.getChild('QuoteMark')
            if (mark !== null) {
              ranges.push(Decoration.replace({ widget: new SpaceWidget(mark.node, mark.to - mark.from) }).range(mark.from, mark.to))
            }
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

export const renderEmphasis = ViewPlugin.fromClass(class {
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
