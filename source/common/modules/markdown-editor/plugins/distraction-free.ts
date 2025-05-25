/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Typewriter Mode
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This extension implements a typewriter like writing experience.
 *
 * END HEADER
 */

import { StateField, type EditorState } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import { configField } from '../util/configuration'

/**
 * The class to be applied to all muted lines
 */
const mutedLineDeco = Decoration.line({ class: 'muted' })

/**
 * Renders all muted lines (except the active one)
 */
function renderMutedLines (state: EditorState): DecorationSet {
  const { distractionFree, muteLines } = state.field(configField)
  if (!distractionFree || !muteLines) {
    return Decoration.none
  }

  const widgets: any[] = []
  const activeLine = state.doc.lineAt(state.selection.main.head).number

  for (let i = 1; i <= state.doc.lines; i++) {
    const lineStart = state.doc.line(i).from
    if (i !== activeLine) {
      widgets.push(mutedLineDeco.range(lineStart))
    }
  }
  return Decoration.set(widgets)
}

const mutedLines = StateField.define<DecorationSet>({
  create (state: EditorState) {
    return renderMutedLines(state)
  },
  update (oldDecoSet, transaction) {
    return renderMutedLines(transaction.state)
  },
  provide: f => EditorView.decorations.from(f)
})

export const distractionFree = [
  mutedLines,
  EditorView.baseTheme({
    '.muted': { opacity: '0.2' }
  })
]
