/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        The selectAll function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file has the selectAll function.
 *
 * END HEADER
 */

import { EditorSelection } from '@codemirror/state'

export function selectAll(text: string): EditorSelection {
  return EditorSelection.create([
    EditorSelection.range(0, text.length)
  ])
}
