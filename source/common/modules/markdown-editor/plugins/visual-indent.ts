/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Visual indentation plugin
 * CVM-Role:        ViewPlugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin ensures that lines in soft-wrapped editors are
 *                  visually correctly indented. It additionally ensures that
 *                  lists, etc. are correctly indented so that the list marker
 *                  is placed outside of the text block.
 *
 *                  See further:
 *                    * https://discuss.codemirror.net/t/making-codemirror-6-respect-indent-for-wrapped-lines/2881
 *                    * https://discuss.codemirror.net/t/updates-not-synchronised-with-requestmeasure-and-viewplugin/4720
 *
 * END HEADER
 */

import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'

function render (view: EditorView): DecorationSet {
  // TODO: The defaultCharacterWidth works perfect for monospaced text, but
  // horrible in combination of deep indentation (list level 2 and above) with
  // flexible-width fonts. For that, we possibly have to fall back to
  // requestMeasure to accurately get the widths required. There is this plugin
  // I may be inspired from: https://gist.github.com/lishid/c10db431cb8a9e83905a3443cfdb53bb
  const charWidth = view.defaultCharacterWidth
  const basePadding = 0
  const tabSize = view.state.tabSize
  const builder = new RangeSetBuilder<Decoration>()

  for (const blockInfo of view.viewportLineBlocks) {
    // Now, we need the text of the line
    const { text } = view.state.doc.lineAt(blockInfo.from)

    // Now first determine how much we're actually offset
    let tabs = 0
    let spaces = 0
    for (const char of text) {
      if (char === '\t') {
        tabs++
      } else if (char === ' ') {
        spaces++
      } else {
        break
      }
    }

    let offset = (tabs * tabSize + spaces) * charWidth

    // Here we additionally account for list markers and indent even further.
    const match = /\s*([+*>-]|\d+\.)\s/.exec(text)
    if (match !== null) {
      offset += (match[1].length + 1) * charWidth
    }

    if (offset > 0) {
      const deco = Decoration.line({
        attributes: {
          style: `text-indent:-${offset}px; padding-left:${offset + basePadding}px;`
        }
      })

      builder.add(blockInfo.from, blockInfo.from, deco)
    }
  }

  return builder.finish()
}

export const softwrapVisualIndent = ViewPlugin.define(view => ({
  decorations: render(view),
  update (u: ViewUpdate) {
    this.decorations = render(u.view)
  }
}), {
  decorations: v => v.decorations
})
