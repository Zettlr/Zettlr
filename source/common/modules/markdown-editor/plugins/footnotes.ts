/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Footnote Cleanup Extension
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     An extension thats removes dangling footnotes,
 *                  sorts them, and moves them to the end of the document
 *
 * END HEADER
 */

import { EditorState, Compartment, type Extension } from '@codemirror/state'
import { ViewPlugin, type ViewUpdate, type EditorView } from '@codemirror/view'
import { configUpdateEffect } from '../util/configuration'
import { cleanupFootnotes } from '../commands/footnotes'

/**
 * This ViewPlugin debounces the footnote cleanup dispatch
*/
const cleanupFootnotesAndNumbering = ViewPlugin.fromClass(class {
  private timeout: number | null = null
  private delay = 2000

  update (update: ViewUpdate) {
    if (!update.docChanged) { return }

    // Avoid cyclic updates
    for (const tr of update.transactions) {
      if (tr.isUserEvent('footnote-cleanup')) {
        return
      }
    }

    this.cleanupFootnotes(update.view)
  }

  cleanupFootnotes (view: EditorView) {
    if (this.timeout != null) {
      window.clearTimeout(this.timeout)
    }

    this.timeout = window.setTimeout(() => {
      this.timeout = null
      cleanupFootnotes(view)

    }, this.delay)
  }

  destroy () {
    if (this.timeout != null) {
      window.clearTimeout(this.timeout)
      this.timeout = null
    }
  }
})

const extensionCompartment = new Compartment()

/**
 * A TransactionExtender that reconfigures the extension compartment in response
 * to a configUpdateEffect if applicable.
 */
const modeSwitcher = EditorState.transactionExtender.of(transaction => {
  let cleanupRefs: boolean|undefined

  for (const effect of transaction.effects) {
    if (effect.is(configUpdateEffect)) {
      if (effect.value.cleanupFootnotes !== undefined) {
        cleanupRefs = effect.value.cleanupFootnotes
      }
    }
  }

  if (cleanupRefs === true) {
    return { effects: extensionCompartment.reconfigure([cleanupFootnotesAndNumbering]) }
  }

  if (cleanupRefs === false) {
    return { effects: extensionCompartment.reconfigure([]) }
  }

  return null
})

/**
 * A configurable extension to cleanup footnotes
 *
 * @param   {boolean}      cleanup    Initial setting for the cleanup behavior
 *                                    (default: true)
 *
 * @return  {Extension[]}             The extension.
 */
export function cleanupFootnotesExtension (cleanup?: boolean): Extension[] {
  const initialSetting = extensionCompartment.of(cleanup ?? true ? [cleanupFootnotesAndNumbering] : [])

  return [ initialSetting, modeSwitcher ]
}
