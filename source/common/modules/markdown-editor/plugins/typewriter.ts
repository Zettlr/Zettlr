// This is a simple, small transaction extender that makes the editor function
// like a typewriter.

import { EditorState, StateField } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { configField } from '../util/configuration'

/**
 * A transaction extender that scrolls the active line into the center of the
 * viewport if the typewriter mode is active
 */
const scrollIntoView = EditorState.transactionExtender.of(transaction => {
  if (!transaction.docChanged) {
    return null
  }

  if (!transaction.state.field(configField).typewriterMode) {
    return null
  }

  return {
    effects: EditorView.scrollIntoView(transaction.state.selection.main.from, { y: 'center' })
  }
})

/**
 * The class to be applied to all muted lines
 */
const typewriterLineDeco = Decoration.line({ class: 'muted' })

/**
 * Renders all muted lines (except the active one)
 */
function renderMutedLines (state: EditorState): DecorationSet {
  const widgets: any[] = []
  const activeLine = state.doc.lineAt(state.selection.main.from).number

  for (let i = 1; i <= state.doc.lines; i++) {
    if (i === activeLine) {
      continue
    }

    const lineStart = state.doc.line(i).from
    widgets.push(typewriterLineDeco.range(lineStart))
  }
  return Decoration.set(widgets)
}

const typewriterMuteLines = StateField.define<DecorationSet>({
  create (state: EditorState) {
    if (!state.field(configField).typewriterMode) {
      return Decoration.none
    }

    return renderMutedLines(state)
  },
  update (oldDecoSet, transaction) {
    if (!transaction.state.field(configField).typewriterMode) {
      return Decoration.none
    }

    console.log('Updating typewriter mode!')

    return renderMutedLines(transaction.state)
  },
  provide: f => EditorView.decorations.from(f)
})

export const typewriter = [
  scrollIntoView,
  typewriterMuteLines
]
