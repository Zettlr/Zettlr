/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror Extension
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A configurable whitespace highlighting extension for CodeMirror.
 *
 * END HEADER
 */

import {
  type Extension,
  Compartment,
  StateEffect,
  EditorState
} from '@codemirror/state'
import {
  highlightWhitespace as hw,
  highlightTrailingWhitespace as htw
} from '@codemirror/view'
import { configUpdateEffect } from '../util/configuration'

const extensionCompartment = new Compartment()

/**
 * A dark mode configuration effect. Pass this to the editor whenever you want
 * to exchange the light or dark themes that the editor uses, or to switch
 * between the light and dark mode.
 */
export const highlightWhitespaceEffect = StateEffect.define<boolean>()

/**
 * A TransactionExtender that reconfigures the darkMode compartment in response
 * to a darkModeEffect if applicable.
 */
const modeSwitcher = EditorState.transactionExtender.of(transaction => {
  // Apply whatever the last effect told us
  let highlight: boolean|undefined
  for (const effect of transaction.effects) {
    // Allow updating both via the main config and a dedicated effect.
    if (effect.is(configUpdateEffect)) {
      if (effect.value.highlightWhitespace !== undefined) {
        highlight = effect.value.highlightWhitespace
      }
    } else if (effect.is(highlightWhitespaceEffect)) {
      highlight = effect.value
    }
  }

  if (highlight === true) {
    return { effects: extensionCompartment.reconfigure([ hw(), htw() ]) }
  } else if (highlight === false) {
    return { effects: extensionCompartment.reconfigure([]) }
  } else {
    return null
  }
})

/**
 * A configurable whitespace highlighter.
 *
 * @param   {boolean}      highlight  Initial setting for the highlighter
 *                                    (default: false)
 *
 * @return  {Extension[]}             The extension.
 */
export function highlightWhitespace (highlight?: boolean): Extension[] {
  const initialSetting = highlight === true ? extensionCompartment.of([ hw(), htw() ]) : extensionCompartment.of([])

  return [ initialSetting, modeSwitcher ]
}
