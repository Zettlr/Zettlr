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
import CodeMirror from 'codemirror'
import headingToID from './util/heading-to-id'

const path = window.path
const ipcRenderer = window.ipc

const VALID_FILETYPES = mdFileExtensions(true)
const atxRE = /^#{1,6}\s(.+)$/

/**
 * Resolves and opens a link safely (= not inside Zettlr, except it's a local MD file)
 *
 * @param   {string}      url  The URL to open
 * @param   {CodeMirror.Editor}  cm   The instance to use if it's a heading link
 */
export default function (url: string, cm: CodeMirror.Editor): void {
  const base: string = (cm as any).getOption('zettlr').markdownImageBasePath

  if (url[0] === '#') {
    // We should open an internal link.
    for (let i = 0; i < cm.lineCount(); i++) {
      const line = cm.getLine(i)
      // Check if we have an ATX heading on this line.
      const match = atxRE.exec(line)
      // If so, and if the corresponding Pandoc ID equals the URL, we got the
      // target.
      if (match !== null && headingToID(match[1]) === url.substring(1)) {
        cm.setCursor({ line: i, ch: 0 })
        cm.refresh()
        break
      }
    }
  } else if (url.startsWith('.')) {
    // We are definitely dealing with a relative URL. So let's resolve it
    const absPath = path.resolve(base, url)
    window.location.assign(`safe-file://${absPath}`)
  } else if (url.startsWith('/') || url.startsWith('\\')) {
    // We are definitely dealing with an absolute URL.
    window.location.assign(`safe-file://${url}`)
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
    const localPath = validURI.replace('file://', '')
    const isValidFile = VALID_FILETYPES.includes(path.extname(localPath))
    const isLocalMdFile = path.isAbsolute(localPath) && isValidFile

    if (isLocalMdFile) {
      // Attempt to open internally
      ipcRenderer.invoke('application', {
        command: 'open-file',
        payload: {
          path: localPath,
          newTab: false
        }
      })
        .catch(e => console.error(e))
    } else {
      window.location.assign(validURI) // Handled by the event listener in the main process
    }
  }
}
