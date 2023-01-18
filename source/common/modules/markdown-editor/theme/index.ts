/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror Theme Entry point
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file manages application of themes
 *
 * END HEADER
 */

import { Compartment, EditorState, StateEffect, StateField } from '@codemirror/state'
import { defaultDark, defaultLight } from './main-override'

const themeCompartment = new Compartment()

export const darkModeSwitch = StateEffect.define<boolean>()

export const themeField = StateField.define<boolean>({
  create (state) {
    return false
  },
  update (value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(darkModeSwitch)) {
        value = effect.value
      }
    }

    return value
  }
})

const themeSwitcher = EditorState.transactionExtender.of((transaction) => {
  const effects: Array<StateEffect<any>> = []
  for (const effect of transaction.effects) {
    if (effect.is(darkModeSwitch)) {
      if (effect.value) {
        effects.push(themeCompartment.reconfigure(defaultDark))
      } else {
        effects.push(themeCompartment.reconfigure(defaultLight))
      }
    }
  }

  return { effects }
})

export const themeManager = [
  themeCompartment.of(defaultLight),
  themeSwitcher,
  themeField
]
