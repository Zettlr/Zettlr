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

import { Compartment, EditorState, Extension, StateEffect } from '@codemirror/state'
import { CoreExtensionOptions } from '../editor-extension-sets'
import { configUpdateEffect } from '../util/configuration'
import { defaultDark, defaultLight, mainOverride } from './main-override'

const themeCompartment = new Compartment()

/**
 * This theme switcher switches between the dark and light theme depending on
 * the corresponding configuration option.
 */
const themeSwitcher = EditorState.transactionExtender.of(transaction => {
  const effects: Array<StateEffect<any>> = []
  for (const effect of transaction.effects) {
    if (effect.is(configUpdateEffect)) {
      if (effect.value.darkMode !== undefined) {
        const newTheme = effect.value.darkMode ? defaultDark : defaultLight
        const themeEffect = themeCompartment.reconfigure(newTheme)
        effects.push(themeEffect)
      }
    }
  }

  return effects.length > 0 ? { effects } : null
})

/**
 * The theme manager should be included in every CodeMirror instance. It offers:
 *
 * * A themeCompartment that contains either the light or the dark base theme
 * * A themeSwitcher, that is a transactionExtender changing the theme according
 *   to the config.
 * * The main Theme override that applies in general
 *
 * @param   {CoreExtensionOptions}  options  The initial options
 *
 * @return  {Extension}                      The extension
 */
export function themeManager (options: CoreExtensionOptions): Extension {
  const startTheme = options.initialConfig.darkMode ? defaultDark : defaultLight
  return [
    // General dark/light theme
    themeCompartment.of(startTheme),
    themeSwitcher,
    // Main overrides
    mainOverride
  ]
}
