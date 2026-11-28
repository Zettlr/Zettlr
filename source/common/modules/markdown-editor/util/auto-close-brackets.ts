/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Configurable bracket closing
 * CVM-Role:        CodeMirror extension
 * Maintainer:      Zettlr contributors
 * License:         GNU GPL v3
 *
 * Description:     Allows the editor to update bracket closing at runtime.
 *
 * END HEADER
 */

import { closeBrackets } from '@codemirror/autocomplete'
import { Compartment, type Extension } from '@codemirror/state'

export const autoCloseBracketsCompartment = new Compartment()

export function autoCloseBracketsExtension (enabled: boolean): Extension {
  return enabled ? closeBrackets() : []
}
