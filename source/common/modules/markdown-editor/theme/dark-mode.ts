/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror Extension
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A Dark mode extension for the CodeMirror editor.
 *
 * END HEADER
 */

// This file contains an extension that allows to switch back and forth between
// dark and light mode. It does not contain any theming, it only sets a base
// theme that signals to any theme extension that it should use its dark/light
// mode.

import {
  type Extension,
  Compartment,
  StateField,
  StateEffect,
  EditorState
} from '@codemirror/state'
import { defaultLight, defaultDark } from './main-override'

const darkModeCompartment = new Compartment()

/**
 * Settings for the dark mode
 */
export interface DarkModeConfiguration {
  /**
   * An array of dark themes to use when in dark mode
   */
  darkThemes: Extension[]
  /**
   * An array of light themes to use when not in dark mode
   */
  lightThemes: Extension[]
  /**
   * Controls whether the editor uses dark mode
   */
  darkMode: boolean
}

/**
 * A dark mode configuration effect. Pass this to the editor whenever you want
 * to exchange the light or dark themes that the editor uses, or to switch
 * between the light and dark mode.
 */
export const darkModeEffect = StateEffect.define<Partial<DarkModeConfiguration>>()

/**
 * The darkModeThemeField stores the configuration for the themes, i.e., the
 * light themes, the dark themes, and whether darkMode is currently active.
 */
const darkModeThemeField = StateField.define<DarkModeConfiguration>({
  create (_state) {
    return {
      lightThemes: [defaultLight],
      darkThemes: [defaultDark],
      darkMode: false
    }
  },
  update (val, transaction) {
    let updated = false
    for (const effect of transaction.effects) {
      if (effect.is(darkModeEffect)) {
        if (effect.value.darkMode !== undefined) {
          val.darkMode = effect.value.darkMode
          updated = true
        }
        if (effect.value.darkThemes !== undefined) {
          val.darkThemes = effect.value.darkThemes
          updated = true
        }
        if (effect.value.lightThemes !== undefined) {
          val.lightThemes = effect.value.lightThemes
          updated = true
        }
      }
    }

    return updated ? { ...val } : val
  }
})

/**
 * A TransactionExtender that reconfigures the darkMode compartment in response
 * to a darkModeEffect if applicable.
 */
const darkModeSwitcher = EditorState.transactionExtender.of(transaction => {
  const field = transaction.state.field(darkModeThemeField, false)
  const effects = []

  if (field === undefined) {
    return null
  }

  for (const effect of transaction.effects) {
    if (effect.is(darkModeEffect)) {
      if (effect.value.darkMode === undefined) {
        continue
      }

      const lightThemes = effect.value.lightThemes ?? field.lightThemes
      const darkThemes = effect.value.darkThemes ?? field.darkThemes

      if (effect.value.darkMode) {
        effects.push(darkModeCompartment.reconfigure(darkThemes))
      } else {
        effects.push(darkModeCompartment.reconfigure(lightThemes))
      }
    }
  }

  return effects.length > 0 ? { effects } : null
})

/**
 * An extension that enables a CodeMirror editor to quickly switch between light
 * and dark themes. Pass an initial configuration to the function, and continue
 * to configure the extension with the darkModeEffect.
 *
 * @param   {Partial<DarkModeConfiguration>}  conf  An optional initial config.
 *                                                  Anything not set will be set
 *                                                  to default.
 *
 * @return  {Extension[]}                           The extension.
 */
export function darkMode (conf?: Partial<DarkModeConfiguration>): Extension[] {
  const lightThemes = conf?.lightThemes ?? [defaultLight]
  const darkThemes = conf?.darkThemes ?? [defaultDark]
  const darkMode = conf?.darkMode ?? false
  const initialThemes = darkMode ? darkThemes : lightThemes

  return [
    darkModeThemeField.init(_state => {
      return { lightThemes, darkThemes, darkMode }
    }),
    darkModeCompartment.of(initialThemes),
    darkModeSwitcher
  ]
}
