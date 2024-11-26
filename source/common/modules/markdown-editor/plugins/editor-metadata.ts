/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        editorMetadataFacet
 * CVM-Role:        CodeMirror Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Provides a simple state facet that can be used to inject
 *                  window and leaf information into an editor state. This is
 *                  primarily used by the vim mode, but could be used by other
 *                  plugins, too. NOTE: Only include this in the main editor, as
 *                  code editors don't have a conception of editor leafs and
 *                  branches.
 *
 * END HEADER
 */

import { Facet } from '@codemirror/state'

interface EditorMetadata {
  windowId: string|undefined
  leafId: string|undefined
}

export const editorMetadataFacet = Facet.define<EditorMetadata, EditorMetadata>({
  combine (value) {
    // Provide empty strings until something has added values to the editor,
    // and then prefer the last provided value
    if (value.length === 0) {
      return { windowId: undefined, leafId: undefined }
    } else {
      return value[value.length - 1]
    }
  },
  compare (a, b) {
    return a.windowId === b.windowId && a.leafId === b.leafId
  },
  compareInput (a, b) {
    return a.windowId === b.windowId && a.leafId === b.leafId
  },
  static: false
})
