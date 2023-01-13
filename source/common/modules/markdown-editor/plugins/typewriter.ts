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

import { Compartment, EditorState, StateEffect, StateField } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { configField, configUpdateEffect } from '../util/configuration'

/**
 * The class to be applied to all muted lines
 */
const typewriterLineDeco = Decoration.line({ class: 'muted' })
const typewriterFocusedLineDeco = Decoration.line({ class: 'typewriter-active-line' })

/**
 * The theme that applies a large margin to the content area to ensure that
 * documents with only one line are still centered vertically
 */
const typewriterTheme = EditorView.theme({
  '.cm-content': {
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

  return { effects }
})

/**
 * Renders all muted lines (except the active one)
 */
function renderMutedLines (state: EditorState): DecorationSet {
  const widgets: any[] = []
  const activeLine = state.doc.lineAt(state.selection.main.head).number

  for (let i = 1; i <= state.doc.lines; i++) {
    const lineStart = state.doc.line(i).from
    if (i === activeLine) {
      widgets.push(typewriterFocusedLineDeco.range(lineStart))
    } else {
      widgets.push(typewriterLineDeco.range(lineStart))
    }
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

    return renderMutedLines(transaction.state)
  },
  provide: f => EditorView.decorations.from(f)
})

export const typewriter = [
  scrollAndTheme,
  typewriterMuteLines,
  typewriterThemeCompartment.of([])
]
