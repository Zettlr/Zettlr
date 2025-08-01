/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        defaultKeymap
 * CVM-Role:        CodeMirror Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains extensions and configuration to enable
 *                  the use of custom keyboard shortcuts for CodeMirror. It
 *                  contains a transaction extender that checks every
 *                  transaction for a shortcutUpdateEffect and regenerates the
 *                  default keymap based off this. Whenever the user changes the
 *                  keyboard bindings, this will update the keymap so that the
 *                  new shortcuts apply.
 *
 * END HEADER
 */

import { Compartment, EditorState, type Extension, StateEffect } from '@codemirror/state'
import { type CustomShortcutConfiguration } from './custom-map'
import { generateDefaultKeymap } from './default'

/**
 * State effect used to override the custom keyboard command map. Provide this
 * with a (partial) map of editor keyboard commands to keyboard shortcuts.
 */
export const shortcutUpdateEffect = StateEffect.define<CustomShortcutConfiguration>()

const keymapCompartment = new Compartment

const shortcutReconfiguration = EditorState.transactionExtender.of(tr => {
  const newEffects = []
  for (const effect of tr.effects) {
    if (effect.is(shortcutUpdateEffect)) {
      newEffects.push(
        keymapCompartment.reconfigure(generateDefaultKeymap(effect.value))
      )
    }
  }
  return { effects: newEffects }
})

export function defaultKeymap (customKeymap?: CustomShortcutConfiguration): Extension {
  return [
    shortcutReconfiguration,
    keymapCompartment.of(generateDefaultKeymap(customKeymap))
  ]
}
