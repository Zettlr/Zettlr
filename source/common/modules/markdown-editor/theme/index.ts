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

import { Compartment, EditorState, StateField, type Extension, type StateEffect } from '@codemirror/state'
import { type CoreExtensionOptions } from '../editor-extension-sets'
import { configField, configUpdateEffect } from '../util/configuration'
import { defaultDark, defaultLight, mainOverride } from './main-override'
import { themeBerlinLight, themeBerlinDark } from './berlin'
import { type MarkdownTheme } from '@providers/config/get-config-template'
import { themeFrankfurtDark, themeFrankfurtLight } from './frankfurt'
import { themeBielefeldDark, themeBielefeldLight } from './bielefeld'
import { themeKarlMarxStadtDark, themeKarlMarxStadtLight } from './karl-marx-stadt'
import { themeBordeauxDark, themeBordeauxLight } from './bordeaux'

const themeCompartment = new Compartment()

const markdownThemeField = StateField.define<{ theme: MarkdownTheme, darkMode: boolean }>({
  create (state) {
    return {
      theme: state.field(configField).theme,
      darkMode: false
    }
  },
  update (val, transaction) {
    let updated = false
    for (const effect of transaction.effects) {
      if (effect.is(configUpdateEffect)) {
        if (effect.value.darkMode !== undefined) {
          updated = true
          val.darkMode = effect.value.darkMode
        }
        if (effect.value.theme !== undefined) {
          updated = true
          val.theme = effect.value.theme
        }
      }
    }

    return updated ? { ...val } : val
  }
})

/**
 * This theme switcher switches between the dark and light theme depending on
 * the corresponding configuration option.
 */
const themeSwitcher = EditorState.transactionExtender.of(transaction => {
  const effects: Array<StateEffect<any>> = []
  const field = transaction.state.field(markdownThemeField, false)
  if (field === undefined) {
    return null
  }

  for (const effect of transaction.effects) {
    if (effect.is(configUpdateEffect)) {
      if (effect.value.darkMode !== undefined || effect.value.theme !== undefined) {
        // Either the theme or the light/dark mode value have changed.
        // const newTheme = effect.value.darkMode ? defaultDark : defaultLight
        if (field.theme === 'berlin') {
          const newTheme = field.darkMode ? themeBerlinDark : themeBerlinLight
          const themeEffect = themeCompartment.reconfigure(newTheme)
          effects.push(themeEffect)
        } else if (field.theme === 'frankfurt') {
          const newTheme = field.darkMode ? themeFrankfurtDark : themeFrankfurtLight
          const themeEffect = themeCompartment.reconfigure(newTheme)
          effects.push(themeEffect)
        } else if (field.theme === 'bielefeld') {
          const newTheme = field.darkMode ? themeBielefeldDark : themeBielefeldLight
          const themeEffect = themeCompartment.reconfigure(newTheme)
          effects.push(themeEffect)
        } else if (field.theme === 'karl-marx-stadt') {
          const newTheme = field.darkMode ? themeKarlMarxStadtDark : themeKarlMarxStadtLight
          const themeEffect = themeCompartment.reconfigure(newTheme)
          effects.push(themeEffect)
        } else if (field.theme === 'bordeaux') {
          const newTheme = field.darkMode ? themeBordeauxDark : themeBordeauxLight
          const themeEffect = themeCompartment.reconfigure(newTheme)
          effects.push(themeEffect)
        } else {
          const newTheme = field.darkMode ? defaultDark : defaultLight
          const themeEffect = themeCompartment.reconfigure(newTheme)
          effects.push(themeEffect)
        }
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
    markdownThemeField,
    themeSwitcher,
    // Main overrides
    mainOverride
  ]
}
