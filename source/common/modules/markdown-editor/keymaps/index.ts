/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror keymap entry point
 * CVM-Role:        CodeMirror Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Defines and exposes an extension for the primary Zettlr keymap.
 *
 * END HEADER
 */

import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { type CustomEditorShortcut } from './shortcuts'
import { keymap } from '@codemirror/view'
import { mainEditorKeybindings } from './default'
import { configUpdateEffect } from '../util/configuration'

const keymapCompartment = new Compartment()

// This transaction extender listens for configUpdate effects and reconfigures
// the keymap accordingly
const keybindingsTransactionExtender = EditorState.transactionExtender.of(tr => {
  let extendedTransaction = null
  for (const effect of tr.effects) {
    if (effect.is(configUpdateEffect) && effect.value.shortcuts !== undefined) {
      extendedTransaction = {
        effects: keymapCompartment.reconfigure(
          keymap.of(mainEditorKeybindings(effect.value.shortcuts))
        )
      }
    }
  }

  return extendedTransaction
})

/**
 * Registers the Zettlr keymap including a transaction extender that keeps the
 * custom shortcuts updated whenever the config changes.
 *
 * @param   {CustomEditorShortcut[]}  customShortcutMap  The initial custom shortcuts
 *
 * @return  {Extension}                                  The keymap
 */
export function zettlrKeymap (customShortcutMap: CustomEditorShortcut[]): Extension {
  return [
    keybindingsTransactionExtender,
    keymapCompartment.of(keymap.of(mainEditorKeybindings(customShortcutMap)))
  ]
}
