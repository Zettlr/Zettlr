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

import { Compartment, EditorState, Extension, StateEffect, StateField } from '@codemirror/state'
import { CoreExtensionOptions } from '../editor-extension-sets'
import { defaultDark, defaultLight, mainOverride } from './main-override'

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
        effects.push(themeCompartment.reconfigure([ mainOverride, defaultDark ]))
      } else {
        effects.push(themeCompartment.reconfigure([ mainOverride, defaultLight ]))
      }
    }
  }

  return { effects }
})

export function themeManager (options: CoreExtensionOptions): Extension {
  return [
    themeCompartment.of([ mainOverride, (options.darkMode) ? defaultDark : defaultLight ]),
    themeSwitcher,
    themeField
  ]
}
