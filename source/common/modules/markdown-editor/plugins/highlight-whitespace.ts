/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror Extension
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A configurable whitespace highlighting extension for CodeMirror.
 *
 * END HEADER
 */

import {
  type Extension,
  Compartment,
  StateEffect,
  EditorState,
  RangeSetBuilder
} from '@codemirror/state'
import {
  EditorView,
  highlightWhitespace as hw,
  highlightTrailingWhitespace as htw,
  Decoration,
  ViewPlugin,
  type ViewUpdate,
  type DecorationSet,
  WidgetType
} from '@codemirror/view'
import { configUpdateEffect } from '../util/configuration'
import { foldedRanges, syntaxTree } from '@codemirror/language'

const extensionCompartment = new Compartment()

/**
 * A widget which adds a pilcrow, '¶', to the end of lines.
 */
class PilcrowWidget extends WidgetType {
  toDOM () {
    const span = document.createElement('span')
    span.className = 'cm-pilcrow'
    span.textContent = '¶'
    span.style.userSelect = 'none'
    span.style.pointerEvents = 'none'
    span.setAttribute('aria-hidden', 'true')

    return span
  }

  ignoreEvent () {
    return true
  }
}

// The widget should appear last, so we set it to the highest side
const pilcrowDeco = Decoration.widget({ widget: new PilcrowWidget(), side: 10000 })

const EXCLUDED_NODES = [
  'CodeText',
  'CodeBlock',
  'FencedCode',
  'YAMLFrontmatter',
  'PandocDivMark',
  'PandocDivInfo',
  'PandocAttribute'
]

function showLineEndings (view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to;) {
      const line = view.state.doc.lineAt(pos)
      pos = line.to + 1

      // Do not draw pilcrows on folded lines so that, when folded,
      // two pilcrows do not appear on the same line.
      let isFolded = false
      foldedRanges(view.state).between(line.from, line.to, (from, to) => {
        if (pos >= from && pos <= to) {
          isFolded = true
          return false
        }
      })

      if (isFolded) { continue }

      const node = syntaxTree(view.state).resolve(line.to, -1)

      if (EXCLUDED_NODES.includes(node.name) || (node.parent && EXCLUDED_NODES.includes(node.parent.name))) {
        continue
      }

      builder.add(line.to, line.to, pilcrowDeco)
    }
  }
  return builder.finish()
}

/**
 * The plugin that configures the line-ending pilcrow.
 */
const pilcrowPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = showLineEndings(view)
  }

  update (update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = showLineEndings(update.view)
    }
  }
}, {
  decorations: v => v.decorations
})

const pilcrowTheme = EditorView.baseTheme({
  '.cm-pilcrow': {
    // By setting `display: inline-block` and
    // `width: 0px`, we prevent the pilcrow
    // from triggering line wrapping
    display: 'inline-block',
    width: '0px',
    // Overrides styling from the `visual-indent` plugin
    // which otherwise causes the pilcrow to be offset into
    // the text.
    textIndent: 'initial',
    // Styling
    color: '#aaa',
    opacity: '0.5',
  }
})

/**
 * A highlight whitespace configuration effect. Pass this to the editor whenever you want
 * to toggle whether whitespace should be highlighted.
 */
export const highlightWhitespaceEffect = StateEffect.define<boolean>()

/**
 * A TransactionExtender that reconfigures the whitespace extension compartment in response
 * to a highlightWhitespaceEffect, if applicable.
 */
const modeSwitcher = EditorState.transactionExtender.of(transaction => {
  // Apply whatever the last effect told us
  let highlight: boolean|undefined
  for (const effect of transaction.effects) {
    // Allow updating both via the main config and a dedicated effect.
    if (effect.is(configUpdateEffect)) {
      if (effect.value.highlightWhitespace !== undefined) {
        highlight = effect.value.highlightWhitespace
      }
    } else if (effect.is(highlightWhitespaceEffect)) {
      highlight = effect.value
    }
  }

  if (highlight === true) {
    return { effects: extensionCompartment.reconfigure([ hw(), htw(), pilcrowPlugin, pilcrowTheme ]) }
  } else if (highlight === false) {
    return { effects: extensionCompartment.reconfigure([]) }
  } else {
    return null
  }
})

/**
 * A configurable whitespace highlighter.
 *
 * @param   {boolean}      highlight  Initial setting for the highlighter
 *                                    (default: false)
 *
 * @return  {Extension[]}             The extension.
 */
export function highlightWhitespace (highlight?: boolean): Extension[] {
  const initialSetting = extensionCompartment.of(highlight ?? true ? [ hw(), htw(), pilcrowPlugin, pilcrowTheme ] : [])

  return [ initialSetting, modeSwitcher ]
}
