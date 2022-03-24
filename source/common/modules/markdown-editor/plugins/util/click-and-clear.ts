/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        clickAndClear
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small helper function that is intended to be used with
 *                  CodeMirror rendering plugins.
 *
 * END HEADER
 */

import CodeMirror, { TextMarker } from 'codemirror'

/**
 * Returns a callback that performs a "click and clear" operation on a rendered
 * textmarker, i.e. remove the marker and place the cursor precisely where the
 * user clicked
 *
 * @param   {TextMarker}  marker  The text marker
 * @param   {CodeMirror}  cm      The CodeMirror instance
 *
 * @return  {Function}            The callback
 */
export default function clickAndClear (
  marker: TextMarker,
  cm: CodeMirror.Editor
): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    marker.clear()
    cm.setCursor(cm.coordsChar({ left: e.clientX, top: e.clientY }))
    cm.focus()
  }
}
