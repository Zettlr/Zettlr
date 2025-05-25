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

import { Compartment, EditorState, StateField, type StateEffect } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import { configField, configUpdateEffect } from '../util/configuration'

/**
 * The class to be applied to the typewriter line
 */
const typewriterFocusedLineDeco = Decoration.line({ class: 'typewriter-active-line' })

/**
 * The theme that applies a large margin to the content area to ensure that
 * documents with only one line are still centered vertically
 */
const typewriterTheme = EditorView.theme({
  '.cm-content': {
    marginTop: '50vh',
    marginBottom: '50vh'
  },
  '.cm-gutters': {
    marginTop: '50vh',
    marginBottom: '50vh'
  }
})

/**
 * This compartment is being used to apply and disengage the theme
 */
const typewriterThemeCompartment = new Compartment()

/**
 * A transaction extender that scrolls the active line into the center of the
 * viewport if the typewriter mode is active, and applies or disengages the
 * corresponding theme based on the configuration
 */
const scrollAndTheme = EditorState.transactionExtender.of(transaction => {
  const effects: Array<StateEffect<any>> = []

  // First, check if we have to apply or disengage the theme
  for (const effect of transaction.effects) {
    if (effect.is(configUpdateEffect)) {
      if (effect.value.typewriterMode === undefined) {
        continue // No reconfiguration of our config value is being performed here
      }

      if (effect.value.typewriterMode) {
        effects.push(typewriterThemeCompartment.reconfigure(typewriterTheme))
      } else {
        effects.push(typewriterThemeCompartment.reconfigure([]))
      }
    }
  }

  // Second, check if we should scroll into view
  if (transaction.docChanged && transaction.state.field(configField).typewriterMode) {
    effects.push(EditorView.scrollIntoView(transaction.state.selection.main.from, { y: 'center' }))
  }

  if (effects.length === 0) {
    return null
  } else {
    return { effects }
  }
})

/**
 * Renders all muted lines (except the active one)
 */
function renderTypewriterLine (state: EditorState): DecorationSet {
  if (!state.field(configField).typewriterMode) {
    return Decoration.none
  }

  const activeLine = state.doc.lineAt(state.selection.main.head).number
  const lineStart = state.doc.line(activeLine).from
  return Decoration.set(typewriterFocusedLineDeco.range(lineStart))
}

const typewriterLine = StateField.define<DecorationSet>({
  create (state: EditorState) {
    return renderTypewriterLine(state)
  },
  update (oldDecoSet, transaction) {
    return renderTypewriterLine(transaction.state)
  },
  provide: f => EditorView.decorations.from(f)
})

export const typewriter = [
  scrollAndTheme,
  typewriterLine,
  typewriterThemeCompartment.of([]),
  EditorView.baseTheme({
    '.cm-content .typewriter-active-line': {
      borderTop: '2px solid var(--grey-3)',
      borderBottom: '2px solid var(--grey-3)',
      // This is wild CSS syntax, but it works! See https://chriscoyier.net/2023/05/12/add-opacity-to-an-existing-color/
      backgroundColor: 'rgb(from var(--grey-1) r g b / 70%)',
      marginTop: '-2px',
      marginBottom: '-2px'
    },
    '&dark .cm-content .typewriter-active-line': {
      backgroundColor: 'rgb(from var(--grey-7) r g b / 70%)'
    }
  })
]
