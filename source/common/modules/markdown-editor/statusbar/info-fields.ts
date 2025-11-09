/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Info Statusbar Items
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
*
 * Description:     This file defines a set of info statusbar items
 *
 * END HEADER
 */

import { type EditorState } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import localiseNumber from '@common/util/localise-number'
import { type StatusbarItem } from '.'
import { countField } from '../plugins/statistics-fields'
import { configField } from '../util/configuration'
import { vimCommandIndicatorField, vimModeField } from '../hooks/vim-fixed-keyboard'
import { getCM } from '@replit/codemirror-vim'

/**
 * Displays the cursor position
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element
 */
export function cursorStatus (state: EditorState, _view: EditorView): StatusbarItem|null {
  const mainOffset = state.selection.main.head
  const line = state.doc.lineAt(mainOffset)
  return {
    content: `${line.number}:${mainOffset - line.from + 1}`
  }
}

/**
 * Displays the word count, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
export function wordcountStatus (state: EditorState, _view: EditorView): StatusbarItem|null {
  const counter = state.field(countField, false)
  const config = state.field(configField, false)
  if (counter === undefined || config?.countChars === true) {
    return null
  } else {
    return {
      content: trans('%s words', localiseNumber(counter.words))
    }
  }
}

/**
 * Displays the character count, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
export function charcountStatus (state: EditorState, _view: EditorView): StatusbarItem|null {
  const counter = state.field(countField, false)
  const config = state.field(configField, false)
  if (counter === undefined|| config?.countChars === false) {
    return null
  } else {
    return {
      content: trans('%s characters', localiseNumber(counter.chars))
    }
  }
}

/**
 * Displays an input mode indication, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
export function inputModeStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const config = state.field(configField, false)
  if (config === undefined) {
    return null
  } else if (config.inputMode === 'vim') {
    // Get detailed vim mode information from state field
    const vimMode = state.field(vimModeField, false) || 'normal'
    console.log('[Vim Mode Status] Current vim mode:', vimMode)
    const modeText = vimMode ? ` (${capitalizeFirst(vimMode)})` : ''

    return {
      content: trans('Input Mode: Vim%s', modeText),
      title: vimMode ? trans('Vim %s mode', capitalizeFirst(vimMode)) : undefined
    }
  } else if (config.inputMode === 'emacs') {
    return {
      content: trans('Input Mode: Emacs')
    }
  } else {
    return null
  }
}


/**
 * Capitalizes the first letter of a string
 *
 * @param   {string}  str  The string to capitalize
 *
 * @return  {string}       The capitalized string
 */
function capitalizeFirst (str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Displays vim command indicator when a trained command is executed
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
export function vimCommandIndicatorStatus (state: EditorState, _view: EditorView): StatusbarItem|null {
  const config = state.field(configField, false)

  // Only show for vim mode
  if (config?.inputMode !== 'vim') {
    return null
  }

  const commandInfo = state.field(vimCommandIndicatorField, false)

  if (!commandInfo) {
    return null
  }

  return {
    content: trans('"%s" executed', commandInfo.command),
    title: trans('Last executed vim command: %s', commandInfo.command)
  }
}
