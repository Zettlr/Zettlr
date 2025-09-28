/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror Extension
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A configurable line number extension for CodeMirror.
 *
 * END HEADER
 */

import {
  lineNumbers
} from '@codemirror/view'
import {
  type Extension,
  Compartment,
  EditorState
} from '@codemirror/state'
import { configUpdateEffect } from '../util/configuration'

const extensionCompartment = new Compartment()

/**
 * A TransactionExtender that reconfigures the line number compartment in response
 * to a showLineNumbersEffect if applicable.
 */
const modeSwitcher = EditorState.transactionExtender.of(transaction => {
  // Apply whatever the last effect told us
  let showLineNumbers: boolean|undefined

  for (const effect of transaction.effects) {
    // Allow updating both via the main config and a dedicated effect.
    if (effect.is(configUpdateEffect)) {
      if (effect.value.showMarkdownLineNumbers !== undefined) {
        showLineNumbers = effect.value.showMarkdownLineNumbers
      }
    }
  }

  if (showLineNumbers === true) {
    return { effects: extensionCompartment.reconfigure([lineNumbers()]) }
  } else if (showLineNumbers === false) {
    return { effects: extensionCompartment.reconfigure([]) }
  } else {
    return null
  }
})

/**
 * A configurable line number renderer.
 *
 * @param   {boolean}      show  Initial setting for the highlighter
 *                                    (default: false)
 *
 * @return  {Extension[]}             The extension.
 */
export function showLineNumbers (show?: boolean): Extension[] {
  const lineNumbersExtension = extensionCompartment.of(show ?? true ? [lineNumbers()] : [])

  return [ lineNumbersExtension, modeSwitcher ]
}
