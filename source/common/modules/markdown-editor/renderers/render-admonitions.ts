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

function getTitleDeco (title: string): Decoration {
  return Decoration.replace({
    widget: new AdmonitionTitleWidget(title)
  })
}

function renderAdmonitionWrappers (view: EditorView): { wrappers: RangeSet<BlockWrapper>, inlines: RangeSet<Decoration> } {
  const wrapperRanges: Range<BlockWrapper>[] = []
  const inlineRanges: Range<Decoration>[] = []
  const includeAdjacent = view.state.field(configField, false)?.previewModeShowSyntaxWhenCursorIsAdjacent ?? true

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter: (node) => {
        if (rangeInSelection(view.state.selection, node.from, node.to, includeAdjacent)) {
          return
        }

        if (node.name !== 'Admonition') {
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

        const classes = ['admonition-wrapper']
        const admonitionHeader = node.node.getChild('AdmonitionHeader')
        const titleMarker = node.node.getChild('AdmonitionTitle')
        const admonitionTitle = titleMarker != null ? view.state.sliceDoc(titleMarker.from, titleMarker.to) : undefined
        if (admonitionHeader !== null) {
          classes.push('admonition')
          const { from, to } = admonitionHeader
          if (admonitionHeader.getChild('AdmonitionNote')) {
            inlineRanges.push(getTitleDeco(admonitionTitle ?? trans('Note')).range(from, to))
            classes.push('note')
          } else if (admonitionHeader.getChild('AdmonitionTip')) {
            inlineRanges.push(getTitleDeco(admonitionTitle ?? trans('Tip')).range(from, to))
            classes.push('tip')
          } else if (admonitionHeader.getChild('AdmonitionImportant')) {
            inlineRanges.push(getTitleDeco(admonitionTitle ?? trans('Important')).range(from, to))
            classes.push('important')
          } else if (admonitionHeader.getChild('AdmonitionWarning')) {
            inlineRanges.push(getTitleDeco(admonitionTitle ?? trans('Warning')).range(from, to))
            classes.push('warning')
          } else if (admonitionHeader.getChild('AdmonitionCaution')) {
            inlineRanges.push(getTitleDeco(admonitionTitle ?? trans('Caution')).range(from, to))
            classes.push('caution')
          }
        }

        if (titleMarker !== null) {
          inlineRanges.push(hiddenDeco.range(titleMarker.from, titleMarker.to))
        }

        const quoteMarkers = node.node.getChildren('QuoteMark')
        for (const q of quoteMarkers) {
          inlineRanges.push(hiddenDeco.range(q.from, q.to))
        }

        const line = view.state.doc.lineAt(node.from)
        const wrapper = BlockWrapper.create({
          tagName: 'admonition-wrapper',
          attributes: {
            class: classes.join(' '),
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
    '.admonition-wrapper.admonition.note': {
      backgroundColor: 'var(--zettlr-editor-admonition-note-bg)',
      borderColor: 'var(--zettlr-editor-admonition-note-color)',
      color: 'var(--zettlr-editor-admonition-note-color)',
    },
    '.admonition-wrapper.admonition.tip': {
      backgroundColor: 'var(--zettlr-editor-admonition-tip-bg)',
      borderColor: 'var(--zettlr-editor-admonition-tip-color)',
      color: 'var(--zettlr-editor-admonition-tip-color)',
    },
    '.admonition-wrapper.admonition.important': {
      backgroundColor: 'var(--zettlr-editor-admonition-important-bg)',
      borderColor: 'var(--zettlr-editor-admonition-important-color)',
      color: 'var(--zettlr-editor-admonition-important-color)',
    },
    '.admonition-wrapper.admonition.warning': {
      backgroundColor: 'var(--zettlr-editor-admonition-warning-bg)',
      borderColor: 'var(--zettlr-editor-admonition-warning-color)',
      color: 'var(--zettlr-editor-admonition-warning-color)',
    },
    '.admonition-wrapper.admonition.caution': {
      backgroundColor: 'var(--zettlr-editor-admonition-caution-bg)',
      borderColor: 'var(--zettlr-editor-admonition-caution-color)',
      color: 'var(--zettlr-editor-admonition-caution-color)',
    }
  })
]
