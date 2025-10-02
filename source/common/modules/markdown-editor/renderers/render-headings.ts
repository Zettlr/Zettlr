/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        HeadingRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer hides heading marks, analogously to the
 *                  emphasis renderer. The reason this is not integrated into
 *                  the emphasis renderer is because this renderer was always
 *                  controlled by a different setting; so keeping it separate
 *                  makes the logic predictable for the users.
 *
 * END HEADER
 */

import { type RangeSet, type Range, type Extension } from '@codemirror/state'
import { rangeInSelection } from '../util/range-in-selection'
import { syntaxTree } from '@codemirror/language'
import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, EditorView, gutter, GutterMarker } from '@codemirror/view'

function hideHeadingMarks (view: EditorView): RangeSet<Decoration> {
  const ranges: Array<Range<Decoration>> = []
  const hiddenDeco = Decoration.replace({})

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter (node) {
        if(rangeInSelection(view.state, node.from, node.to, true)) {
          return
        }

        if (!node.name.startsWith('ATXHeading')) {
          return
        }

        const mark = node.node.getChild('HeaderMark')
        if (mark === null) {
          return
        }

        const span = view.state.sliceDoc(mark.to, node.to)
        let offset = 0
        while (span.charAt(offset) === ' ') {
          offset++
        }
        ranges.push(hiddenDeco.range(mark.from, mark.to + offset))
        return false
      }
    })
  }

  return Decoration.set(ranges, true)
}

export const renderHeadings = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = hideHeadingMarks(view)
  }

  update (update: ViewUpdate): void {
    this.decorations = hideHeadingMarks(update.view)
  }
}, {
  decorations: v => v.decorations
})

// Second part of this file: Define a heading gutter.

class HeadingMarkGutter extends GutterMarker {
  constructor (private readonly level: number) {
    super()
  }

  toDOM () {
    const mark = document.createElement('div')
    mark.textContent = `h${this.level}`
    return mark
  }
}

export const headingGutter: Extension[] = [
  gutter({
    class: 'cm-heading-gutter',
    renderEmptyElements: false,
    initialSpacer: () => new HeadingMarkGutter(1),
    lineMarker (view, line, _otherMarkers) {
      const node = syntaxTree(view.state).resolve(line.from, 1)
      if (node.name !== 'HeaderMark') {
        return null
      }

      const parent = node.parent
      if (parent === null || !parent.name.startsWith('ATXHeading')) {
        return null
      }

      const level = parseInt(parent.name.slice(10), 10)
      if (Number.isNaN(level)) {
        return null
      }

      return new HeadingMarkGutter(level)
    }
  }),
  EditorView.baseTheme({
    '.cm-heading-gutter .cm-gutterElement': {
      display: 'flex',
      alignItems: 'center'
    },
    '.cm-heading-gutter .cm-gutterElement div': {
      fontFamily: 'monospace',
      opacity: '0.3',
      fontSize: '80%'
    }
  })
]
