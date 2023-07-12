/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        openMarkdownLink function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function opens a Markdown link, performing necessary
 *                  transformations where applicable.
 *
 * END HEADER
 */

import makeValidUri from '@common/util/make-valid-uri'
import { type EditorState, type Line } from '@codemirror/state'
import { configField } from './configuration'
import { EditorView } from '@codemirror/view'
import { tocField } from '../plugins/toc-field'
import { hasMdOrCodeExt } from '@providers/fsal/util/is-md-or-code-file'

const path = window.path
const ipcRenderer = window.ipc

/**
 * Uses the ToC field within the editor state to determine the line descriptor
 * for the given heading ID (if applicable)
 *
 * @param   {string}       headingId  The heading ID to search for
 * @param   {EditorState}  state      The state
 *
 * @return  {Line|undefined}          The line, or undefined
 */
function findMatchingHeading (headingId: string, state: EditorState): Line|undefined {
  headingId = headingId.toLowerCase()

  for (const entry of state.field(tocField)) {
    if (entry.id.toLowerCase() === headingId) {
      return state.doc.line(entry.line)
    }
  }
}

/**
 * Resolves and opens a link safely (= not inside Zettlr, except it's a local MD file)
 *
 * @param   {string}      url  The URL to open
 * @param   {CodeMirror.Editor}  cm   The instance to use if it's a heading link
 */
export default function (url: string, view: EditorView): void {
  if (url.startsWith('#')) {
    // We should open an internal link, i.e. "jump to line".
    const targetLine = findMatchingHeading(url.substring(1), view.state)
    if (targetLine !== undefined) {
      view.dispatch({
        selection: { anchor: targetLine.from, head: targetLine.to },
        effects: EditorView.scrollIntoView(targetLine.from, { y: 'center' })
      })
    }
  } else {
    const searchParams = new URLSearchParams(window.location.search)
    const windowId = searchParams.get('window_id') as string
    const base = path.dirname(view.state.field(configField).metadata.path)
    const validURI = makeValidUri(url, base)

    // Create a path from the URL by stripping the protocol and decoding any
    // potential encoded characters.
    const localPath = decodeURIComponent(validURI.replace('safe-file://', ''))

    // It's a valid file we can open if it's an absolute path to a Markdown or
    // code file
    if (validURI.startsWith('safe-file://') && path.isAbsolute(localPath) && hasMdOrCodeExt(localPath)) {
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: { path: localPath, newTab: false, windowId }
      })
        .catch(e => console.error(e))
    } else {
      // Handled by the event listener in the main process
      window.location.assign(validURI)
    }
  }
}
