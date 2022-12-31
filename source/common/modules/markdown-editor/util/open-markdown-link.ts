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

import { mdFileExtensions } from '@providers/fsal/util/valid-file-extensions'
import makeValidUri from '@common/util/make-valid-uri'
import { EditorState, Line } from '@codemirror/state'
import { configField } from './configuration'
import { EditorView } from '@codemirror/view'
import { tocField } from '../plugins/toc-field'
import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'

const path = window.path
const ipcRenderer = window.ipc

const VALID_FILETYPES = mdFileExtensions(true)

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
  const base = path.dirname(view.state.field(configField).metadata.path)
  const searchParams = new URLSearchParams(window.location.search)
  const windowId = searchParams.get('window_id') as string

  if (url[0] === '#') {
    // We should open an internal link, i.e. "jump to line".
    const targetLine = findMatchingHeading(url.substring(1), view.state)
    if (targetLine !== undefined) {
      view.dispatch({
        selection: { anchor: targetLine.from, head: targetLine.to },
        effects: EditorView.scrollIntoView(targetLine.from, { y: 'center' })
      })
    }
  } else if (url.startsWith('/') || url.startsWith('\\') || url.startsWith('.')) {
    // We are definitely dealing with a relative or absolute URL.
    const absPath = url.startsWith('.') ? path.resolve(base, url) : url
    if (hasMarkdownExt(absPath)) {
      // Attempt to open internally
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: { path: absPath, newTab: false, windowId }
      })
        .catch(e => console.error(e))
    } else {
      window.location.assign(`safe-file://${absPath}`)
    }
  } else {
    // It is valid Markdown to surround the URL with < and >
    url = url.replace(/^<(.+)>$/, '$1') // Looks like an Emoji!
    // We'll be making use of a helper function here, because
    // we cannot rely on the errors thrown by new URL(), as,
    // e.g., file://./relative.md will not throw an error albeit
    // we need to convert it to absolute.
    const validURI = makeValidUri(url, base)

    // Now we have a valid link. Finally, let's check if we can open the file
    // internally, without having to switch to an external program.
    const localPath = validURI.replace('safe-file://', '')
    const isValidFile = VALID_FILETYPES.includes(path.extname(localPath))
    const isLocalMdFile = path.isAbsolute(localPath) && isValidFile

    if (isLocalMdFile) {
      // Attempt to open internally
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: { path: localPath, newTab: false, windowId }
      })
        .catch(e => console.error(e))
    } else {
      window.location.assign(validURI) // Handled by the event listener in the main process
    }
  }
}
