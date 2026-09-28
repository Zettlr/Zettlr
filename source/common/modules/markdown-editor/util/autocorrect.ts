/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Autocorrect content attribute for the Windows emoji panel
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Chromium reverts emoji-panel insertions when the focused
 *                  editable element sets `autocorrect="off"` (Chromium bugs
 *                  487613498 and 530123092). CodeMirror sets that attribute,
 *                  so the Win+. symbol panel inserted nothing into the editor
 *                  (issue #6547). Re-enabling it on Windows restores the
 *                  panel; physical keyboards do not read the attribute.
 *
 * END HEADER
 */

import { type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

/**
 * Returns the content attribute extension that re-enables autocorrect for the
 * Windows symbol and emoji panel, or an empty extension on other platforms.
 *
 * @param   {string}  platform  The platform to check (defaults to the current one)
 *
 * @return  {Extension}         The content attribute extension, if applicable
 */
export function autocorrectOnWindows (platform: string = process.platform): Extension {
  if (platform !== 'win32') {
    return []
  }

  return EditorView.contentAttributes.of({ autocorrect: 'on' })
}
