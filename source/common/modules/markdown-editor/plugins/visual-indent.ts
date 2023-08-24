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
 * END HEADER
 */

import { RangeSetBuilder, type Line } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate
} from '@codemirror/view'

function render (view: EditorView, measurements?: Map<string, number>): DecorationSet {
  // Original inspiration came from this plugin:
  // https://gist.github.com/lishid/c10db431cb8a9e83905a3443cfdb53bb
  // HOWEVER, that didn't quite do the job. After months of thinking, I finally
  // had a good idea, which is what the below shows:
  const charWidth = view.defaultCharacterWidth
  const tabSize = view.state.tabSize
  const builder = new RangeSetBuilder<Decoration>()

  // The CM editor styles apply a basic 6px padding. NOTE: This may change in
  // the future, in that case look this up and adapt it again!
  const basePadding = 6

  const visibleLines = new Set<Line>()
  for (const { from, to } of view.visibleRanges) {
    const firstLine = view.state.doc.lineAt(from).number
    const lastLine = view.state.doc.lineAt(to).number
    for (let i = firstLine; i <= lastLine; i++) {
      visibleLines.add(view.state.doc.line(i))
    }
  }

  for (const line of [...visibleLines]) {
    // First determine how much we're actually offset
    let tabs = 0
    let spaces = 0
    for (const char of line.text) {
      if (char === '\t') {
        tabs++
      } else if (char === ' ') {
        spaces++
      } else {
        break
      }
    }

    let offset = tabs * tabSize + spaces

    // Here we additionally account for list markers and indent even further.
    // BUG: Currently this applies even to code files, which is not desirable.
    const match = /^\s*((?:[+*>-](?:\s\[[x\s]\])?|\d+\.)\s)/.exec(line.text)
    offset += match !== null ? match[1].length : 0

    if (offset === 0) {
      continue // Nothing to indent here
    }

    // We must use ONLY what the measurement is based on, because otherwise we're
    // going to have "jumpy" text when the user adds new characters to the line
    // which result in a cache miss and thus a very small flicker when the plugin
    // switches from the estimate to the measurement. The upshot of this is that
    // we save a ton of resources, because only one of such measurements will be
    // taken per render (see key: measurementKey)
    const measurementKey = line.text.slice(0, offset)

    view.requestMeasure({
      read (view) {
        const base = view.contentDOM.getBoundingClientRect().left
        const after = view.coordsAtPos(line.from + offset)?.left ?? 0
        if (after === 0) {
          return // Could not retrieve coordinates
        }
        measurements?.set(measurementKey, after - base)
      },
      key: measurementKey
    })

    const indent = measurements?.get(measurementKey)
    if (indent !== undefined) {
      // Shortcut if we have measured this indent the last time around
      // NOTE: This time we do not need the basePadding, as the measurement
      // comes straight from the DOM and thus already includes that.
      const deco = Decoration.line({ attributes: { style: `text-indent: -${indent}px; padding-left: ${indent}px;` } })
      builder.add(line.from, line.from, deco)
    } else {
      // There is not yet a measurement, so use an estimate (which will be fine
      // for monospace, and off for other fonts). NOTE that we have to include
      // the base padding that CodeMirror itself adds.
      const pxOffset = offset * charWidth
      const deco = Decoration.line({ attributes: { style: `text-indent: -${pxOffset}px; padding-left: ${pxOffset + basePadding}px;` } })
      builder.add(line.from, line.from, deco)
    }
  }

  return builder.finish()
}

export const softwrapVisualIndent = ViewPlugin.define(view => ({
  decorations: render(view),
  // This is an additional property, required to ensure that different editors
  // in the same renderer processes have their own measurements (i.e. if you
  // have a JSON and a Markdown file with monospace vs. sans-serif open at the
  // same time)
  measurements: new Map<string, number>(),
  update (u: ViewUpdate) {
    this.decorations = render(u.view, this.measurements)
  }
}), {
  decorations (value) {
    return value.decorations
  }
})
