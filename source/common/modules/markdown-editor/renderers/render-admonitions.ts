/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        renderBlockquotes
 * CVM-Role:        View
 * Maintainer:      Bennie Milburn
 * License:         GNU GPL v3
 *
 * Description:     This renderer adds a vertical bar
 *                  to the left edge of blockquotes
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import type { Range, RangeSet } from '@codemirror/state'
import { BlockWrapper, Decoration, EditorView, ViewPlugin, WidgetType, type ViewUpdate } from '@codemirror/view'
import { rangeInSelection } from '../util/range-in-selection'
import type { SyntaxNode } from '@lezer/common'
import { configField } from '../util/configuration'
import { trans } from 'source/common/i18n-renderer'
import { validAdmonitionKeywords } from '../parser/admonition-parser'

class AdmonitionTitleWidget extends WidgetType {
  constructor (private readonly title: string) {
    super()
  }

  toDOM () {
    const span = document.createElement('span')
    span.className = 'cm-admonition-title'
    span.textContent = this.title
    return span
  }

  ignoreEvent () {
    return true
  }
}

const hiddenDeco = Decoration.replace({})

function renderAdmonitionWrappers (view: EditorView): { wrappers: RangeSet<BlockWrapper>, inlines: RangeSet<Decoration> } {
  const wrapperRanges: Range<BlockWrapper>[] = []
  const inlineRanges: Range<Decoration>[] = []
  const includeAdjacent = view.state.field(configField, false)?.previewModeShowSyntaxWhenCursorIsAdjacent ?? true

  const tree = syntaxTree(view.state)
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from, to,
      enter: (node) => {
        if (!node.type.is('Admonition')) {
          return
        }

        if (rangeInSelection(view.state.selection, node.from, node.to, includeAdjacent)) {
          return
        }

        const keywordMarker = node.node.getChild('AdmonitionKeyword')
        if (keywordMarker === null) {
          return
        }

        const keyword = view.state.sliceDoc(keywordMarker.from, keywordMarker.to).toLowerCase()

        if (!validAdmonitionKeywords.includes(keyword)) {
          return
        }

        let parent: SyntaxNode|null = node.node.parent
        let parentNode

        while (parent) {
          if (parent.name === 'Admonition') {
            parentNode = parent.node
          }
          parent = parent.parent
        }

        if (parentNode && rangeInSelection(view.state.selection, parentNode.from, parentNode.to, includeAdjacent)) {
          return
        }

        const genericKeywordTranslated = {
          note: trans('Note'),
          tip: trans('Tip'),
          important: trans('Important'),
          warning: trans('Warning'),
          caution: trans('Caution')
        }[keyword] ?? trans('Note')

        // Then, we may have a custom title in the AdmonitionTitle element.
        const titleMarker = node.node.getChild('AdmonitionTitle')

        // Hide title marker, keyword marker, and the quote and code marks
        if (titleMarker !== null) {
          // We have a custom title -> hide the keyword entirely
          const widget = new AdmonitionTitleWidget(view.state.sliceDoc(titleMarker.from, titleMarker.to))
          inlineRanges.push(
            Decoration
              .replace({ widget })
              .range(keywordMarker.from, titleMarker.to)
          )
        } else {
          // We need a generic widget with the keyword
          const widget = new AdmonitionTitleWidget(genericKeywordTranslated)
          inlineRanges.push(
            Decoration
              .replace({ widget })
              .range(keywordMarker.from, keywordMarker.to)
          )
        }

        for (const qm of node.node.getChildren('QuoteMark')) {
          inlineRanges.push(hiddenDeco.range(qm.from, qm.to))
        }
        for (const cm of node.node.getChildren('AdmonitionMark')) {
          inlineRanges.push(hiddenDeco.range(cm.from, cm.to))
        }

        const line = view.state.doc.lineAt(node.from)
        const wrapper = BlockWrapper.create({
          tagName: 'admonition-wrapper',
          attributes: {
            class: [ 'admonition-wrapper', keyword ].join(' '),
          }
        })

        wrapperRanges.push(wrapper.range(line.from, node.to))
      },
    })
  }

  return {
    wrappers: BlockWrapper.set(wrapperRanges, true),
    inlines: Decoration.set(inlineRanges, true)
  }
}

const admonitionPlugin = ViewPlugin.fromClass(class {
  blockWrappers: RangeSet<BlockWrapper>
  inlines: RangeSet<Decoration>

  constructor (view: EditorView) {
    const { wrappers, inlines } = renderAdmonitionWrappers(view)
    this.blockWrappers = wrappers
    this.inlines = inlines
  }

  update (update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      const { wrappers, inlines } = renderAdmonitionWrappers(update.view)
      this.blockWrappers = wrappers
      this.inlines = inlines
    }
  }

}, {
  provide: plugin => {
    return [
      EditorView.blockWrappers.of(view => view.plugin(plugin)?.blockWrappers ?? BlockWrapper.set([])),
      EditorView.decorations.of(view => view.plugin(plugin)?.inlines ?? Decoration.none)
    ]
  }
})

export const renderAdmonitions = [
  admonitionPlugin,
  EditorView.baseTheme({
    '.admonition-wrapper': {
      display: 'block',
      borderRadius: '8px',
      padding: '0.5em',
      marginLeft: '0.25em',
      border: '1px solid transparent'
    },
    '.admonition-wrapper .cm-line': {
      // We need to revert these stylings set by the
      // visual-indent plugin since they conflict with
      // the padding set by the wrapper.
      paddingLeft: 'revert !important',
      textIndent: 'revert !important'
    },
    '.admonition-wrapper.note': {
      backgroundColor: 'var(--zettlr-note-bg)',
      borderColor: 'var(--zettlr-note-color)',
      color: 'var(--zettlr-note-color)',
    },
    '.admonition-wrapper.tip': {
      backgroundColor: 'var(--zettlr-tip-bg)',
      borderColor: 'var(--zettlr-tip-color)',
      color: 'var(--zettlr-tip-color)',
    },
    '.admonition-wrapper.important': {
      backgroundColor: 'var(--zettlr-important-bg)',
      borderColor: 'var(--zettlr-important-color)',
      color: 'var(--zettlr-important-color)',
    },
    '.admonition-wrapper.warning': {
      backgroundColor: 'var(--zettlr-warning-bg)',
      borderColor: 'var(--zettlr-warning-color)',
      color: 'var(--zettlr-warning-color)',
    },
    '.admonition-wrapper.caution': {
      backgroundColor: 'var(--zettlr-caution-bg)',
      borderColor: 'var(--zettlr-caution-color)',
      color: 'var(--zettlr-caution-color)',
    }
  })
]
