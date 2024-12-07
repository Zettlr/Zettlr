/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Readability Statusbar Item
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file defines the readability statusbar item
 *
 * END HEADER
 */

import { type EditorState } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import { hasMarkdownExt } from '@common/util/file-extention-checks'
import { type StatusbarItem } from '../statusbar'
import { configField, configUpdateEffect } from '../util/configuration'

/**
 * Displays the readability mode status, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
export function readabilityStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const config = state.field(configField, false)
  if (config === undefined || !hasMarkdownExt(config.metadata.path)) {
    return null
  }

  return {
    content: `<cds-icon shape=${config.readabilityMode ? 'eye' : 'eye-hide'}></cds-icon>`,
    allowHtml: true,
    title: trans('Readability mode (%s)', config.readabilityAlgorithm),
    onClick (event) {
      view.dispatch({ effects: configUpdateEffect.of({ readabilityMode: !config.readabilityMode }) })
    }
  }
}
