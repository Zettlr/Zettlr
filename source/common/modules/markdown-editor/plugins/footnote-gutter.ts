/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Footnote Gutter
 * CVM-Role:        CodeMirror Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file defines an extension that displays a gutter for
 *                  adding small buttons (icons) next to footnote bodies to
 *                  allow users to go to the corresponding footnote reference in
 *                  the text.
 *
 * END HEADER
 */

import { type Extension } from '@codemirror/state'
import { EditorView, gutter, GutterMarker, type BlockInfo } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'

/**
 * A footnote gutter marker: Basically only a large circle arrow CDS icon
 */
class FootnoteGutterMarker extends GutterMarker {
  toDOM (_view: EditorView): Node {
    const icon = document.createElement('cds-icon')
    icon.setAttribute('shape', 'circle-arrow')
    icon.setAttribute('solid', 'true')
    icon.setAttribute('size', 'md')
    icon.title = trans('Go to footnote reference')
    return icon
  }
}

/**
 * This regular expression matches footnote bodies. It includes a capturing body
 * to extract the footnote reference associated with the body.
 *
 * @var {RegExp}
 */
const fnBodyRE = /^(\[\^.+?\]):/

// Export the footnote gutter extension
export const footnoteGutter: Extension[] = [
  gutter({
    class: 'cm-footnote-gutter',
    renderEmptyElements: false,
    // For each line that contains a footnote reference body, add an icon to the gutter
    lineMarker (view: EditorView, line: BlockInfo, _otherMarkers: readonly GutterMarker[]): GutterMarker|null {
      const lineText = view.state.sliceDoc(line.from, line.to)
      return fnBodyRE.test(lineText) ? new FootnoteGutterMarker() : null
    },
    // This ensures the gutter never collapses
    initialSpacer: () => new FootnoteGutterMarker(),
    // When the user clicks on the gutter (specifically, on one of the icons),
    // go to the corresponding footnote reference (if applicable)
    domEventHandlers: {
      click (view, line, event) {
        const lineText = view.state.sliceDoc(line.from, line.to)
        const match = fnBodyRE.exec(lineText)
        if (match === null) {
          return false
        }

        // We have a footnote ref body. Now we need to find the corresponding
        // footnote reference's from and to positions.
        const fnRefStart = view.state.sliceDoc().indexOf(match[1])
        if (fnRefStart < 0) {
          return false // Corresponding ref not found
        }

        view.dispatch({
          selection: { anchor: fnRefStart, head: fnRefStart + match[1].length },
          scrollIntoView: true
        })
        return true
      }
    }
  }),
  EditorView.baseTheme({
    '.cm-footnote-gutter .cm-gutterElement': {
      cursor: 'pointer',
      fontFamily: 'monospace'
    }
  })
]
