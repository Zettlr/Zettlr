/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Diagnostics Statusbar Item
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file defines the diagnostics statusbar item
 *
 * END HEADER
 */

import { type EditorState } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import { type StatusbarItem } from '.'
import { openLintPanel, closeLintPanel, forEachDiagnostic } from '@codemirror/lint'

/**
 * Displays a count of all diagnostics
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element
 */
export function diagnosticsStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  let info = 0
  let warn = 0
  let error = 0
  forEachDiagnostic(state, (dia, _from, _to) => {
    if (dia.severity === 'info') {
      info++
    } else if (dia.severity === 'warning') {
      warn++
    } else {
      error++
    }
  })

  return {
    content: `<cds-icon shape="help-info"></cds-icon> ${info} <cds-icon shape="warning-standard"></cds-icon> ${warn} <cds-icon shape="times-circle"></cds-icon> ${error}`,
    allowHtml: true,
    title: trans('Toggle diagnostics panel'),
    onClick (event) {
      // We try to close the panel first because closeLintPanel() returns false
      // if the panel is already closed but openLintPanel() only returns true.
      if (!closeLintPanel(view)) {
        openLintPanel(view)
      }
    }
  }
}
