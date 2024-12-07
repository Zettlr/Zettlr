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

import { syntaxTree } from '@codemirror/language'
import type { RangeSet, Range, Line } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  type EditorView,
  type ViewUpdate
} from '@codemirror/view'
import { SpaceWidget } from '../renderers/render-emphasis'

function render (view: EditorView, measurements?: Map<string, number>): RangeSet<Decoration> {
  // Original inspiration came from this plugin:
  // https://gist.github.com/lishid/c10db431cb8a9e83905a3443cfdb53bb
  // HOWEVER, that didn't quite do the job. After months of thinking, I finally
  // had a good idea, which is what the below shows.

  const tabSize = view.state.tabSize
  const ranges: Array<Range<Decoration>> = []

  // Then, retrieve all lines that are indentable via this plugin. These are:
  // All lines that are part of the current viewport and that are not part of a
  // code block. Why no code block? First, code blocks will always be in
  // monospace. (If you use Custom CSS to make them non-monospaced, you are a
  // cruel human being and deserve to be punished.) Second, if we mess with the
  // indentation and padding of lines within code blocks, we mess up the
  // calculations that happen to apply the gray background to our code blocks,
  // which will make it look like a visual bug.
  const indentableLines = new Set<Line>()
  for (const { from, to } of view.visibleRanges) {
    const firstLine = view.state.doc.lineAt(from).number
    const lastLine = view.state.doc.lineAt(to).number
    for (let i = firstLine; i <= lastLine; i++) {
      const currentLine = view.state.doc.line(i)
      const nodeAtPos = syntaxTree(view.state).resolve(currentLine.from, 1)
      if (nodeAtPos.name !== 'CodeText') {
        indentableLines.add(currentLine)
      }
    }
  }

  // Now that we know which lines need to be potentially indented, let's go
  // through them one by one.
  for (const line of [...indentableLines]) {
    // Before we do ANYTHING ELSE, we MUST UNDER ALL CIRCUMSTANCES replace any
    // tab characters with spaces using a replacement widget. "Why?" you may ask
    // now. Well, because tab characters in CodeMirror behave very weirdly in
    // conjunction with negative text-indents. "How so?", you will ask. Well,
    // because of the way tab characters are *intended* (not indented) to be
    // used: They don't have a fixed width. Rather, they are supposed to "snap"
    // to invisible vertical columns on a page (today rather a container on a
    // website). However, by applying text-indents below, we basically move the
    // starting offset for these tab characters around, and they really don't
    // like that. In effect, this results in what many have described as
    // "jumping" behavior: Whenever the required text indent is recalculated (in
    // the measuring phase below), we will read the text indent together with
    // the current width of the tab character. As soon as the new text indent is
    // applied, however, the browser will recalculate the actual width required
    // for the tab in order to snap it to one of these columns. Since that is
    // asynchronous with how we need to take our measurements, the next time WE
    // measure the text indent, it has changed AGAIN. This means that for every
    // measuring phase, we move the line around due to this behavior of tabs.
    // Over the past year, I have tried several attempts. First, I tried to find
    // ways of making tabs fixed-width, but there is no mechanism for that. Then
    // I thought very long to no avail, but suddenly I had an idea. If tabs are
    // the problem, why not completely remove them from the renderer? After all,
    // the mechanism works flawlessly with spaces. This led to PR #5384.
    // However, normalizing all files like this comes with an insane amount of
    // added complexity that I never fully figured out. However, on Halloween
    // 2024, I figured out the solution. And let me tell you: It is SO STUPID,
    // SO SIMPLE, SO FUCKING OBVIOUS that I am absolutely ashamed of myself that
    // it took me literally x months to get to it, even though all pieces were
    // already in place: Simply replace every tab character with `tabSize`
    // spaces using a replacement decoration. That's it. That's the entire
    // story. It's simple, works, easy to maintain, and has the wanted effect.
    for (let j = 0; j < line.text.length; j++) {
      if (line.text.charAt(j) !== '\t') {
        break
      }

      ranges.push(
        Decoration
          .replace({ widget: new SpaceWidget(tabSize) })
          .range(line.from + j, line.from + j + 1)
      )
    }

    // Now, after having averted the dance macabre
    // (https://www.youtube.com/watch?v=7Gr63DiEUxw), here's the original
    // algorithm -- unchanged, mind you!

    // First determine how much we're offset based purely on whitespace.
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

    // Second, determine the offset based on list elements.
    const match = /^\s*((?:[+*>-](?:\s\[[x\s]\])?|\d+\.)\s)/.exec(line.text)
    const listMarker = match !== null ? match[1].length : 0

    const columnLineTextStart = spaces + tabs + listMarker
    // const visualLineTextStart = spaces + tabs * tabSize + listMarker

    if (columnLineTextStart === 0) {
      continue // Neither whitespace nor list elements on that line.
    }

    // Now that we know we need to indent this line, schedule a measurement so
    // that in the next round of this code running we have an accurate
    // indentation even for non-monospaced text. What we want to measure is
    // exclusively what we are basing our indentation on. If we use the entire
    // line as a key, we cause (a) duplicated measurements (`* One` and `* Two`
    // require the same indentation) and (b) cause cache misses which results in
    // jumpy behavior when the user adds novel characters to the line.
    const measurementKey = line.text.slice(0, columnLineTextStart).replace('\t', ' '.repeat(tabSize))

    view.requestMeasure({
      read (view) {
        const base = view.contentDOM.getBoundingClientRect().left
        const after = view.coordsAtPos(line.from + columnLineTextStart)?.left ?? 0
        if (after === 0) {
          return // Could not retrieve coordinates
        }
        // Note that this continuously updates our measurements after any layout
        // changes
        measurements?.set(measurementKey, after - base)
      },
      key: measurementKey
    })

    const indent = measurements?.get(measurementKey)
    if (indent !== undefined) {
      // NOTE: Each `.cm-line` has a padding of `0 2px 0 6px` as per CodeMirror's
      // base styles from somewhere in the library. We need to account for that
      // not to induce any problems.
      const basePadding = 6
      const deco = Decoration.line({ attributes: { style: `text-indent: -${indent-basePadding}px; padding-left: ${indent}px;` } })
      ranges.push(deco.range(line.from))
    }
  }

  return Decoration.set(ranges, true)
}

export const softwrapVisualIndent = ViewPlugin.define(view => ({
  decorations: render(view),
  // This is an additional property, required to ensure that each editor
  // instance has its own map, preventing any potential interference.
  measurements: new Map<string, number>(),
  update (u: ViewUpdate) {
    this.decorations = render(u.view, this.measurements)
  }
}), {
  decorations (value) {
    return value.decorations
  }
})
