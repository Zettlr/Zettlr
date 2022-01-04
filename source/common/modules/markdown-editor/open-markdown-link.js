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

const { mdFileExtensions } = require('@common/get-file-extensions')
const makeValidUri = require('@common/util/make-valid-uri')
const path = window.path
const ipcRenderer = window.ipc

const VALID_FILETYPES = mdFileExtensions(true)

/**
 * Resolves and opens a link safely (= not inside Zettlr, except it's a local MD file)
 *
 * @param   {String}      url  The URL to open
 * @param   {CodeMirror}  cm   The instance to use if it's a heading link
 */
module.exports = function (url, cm) {
  if (url[0] === '#') {
    // We should open an internal link
    let re = new RegExp('#\\s[^\\r\\n]*?' +
    url.replace(/-/g, '[^\\r\\n]+?').replace(/^#/, ''), 'i')
    // The new regex should now match the corresponding heading in the document
    for (let i = 0; i < cm.lineCount(); i++) {
      let line = cm.getLine(i)
      if (re.test(line)) {
        cm.setCursor({ 'line': i, 'ch': 0 })
        cm.refresh()
        break
      }
    }
  } else {
    // It is valid Markdown to surround the URL with < and >
    url = url.replace(/^<(.+)>$/, '$1') // Looks like an Emoji!
    // We'll be making use of a helper function here, because
    // we cannot rely on the errors thrown by new URL(), as,
    // e.g., file://./relative.md will not throw an error albeit
    // we need to convert it to absolute.
    let base = cm.getOption('zettlr').markdownImageBasePath
    let validURI = makeValidUri(url, base)

    // Now we have a valid link. Finally, let's check if we can open the file
    // internally, without having to switch to an external program.
    const localPath = validURI.replace('file://', '')
    const isValidFile = VALID_FILETYPES.includes(path.extname(localPath))
    const isLocalMdFile = path.isAbsolute(localPath) === true && isValidFile

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
