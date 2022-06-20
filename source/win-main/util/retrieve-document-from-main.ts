import countWords from '@common/util/count-words'
import { MainEditorDocumentWrapper } from '@dts/renderer/editor'
import CodeMirror from 'codemirror'

const ipcRenderer = window.ipc

/**
 * Resolves a file extension to a valid CodeMirror mode
 *
 * @param   {string}  ext  The file extension (with leading dot!)
 *
 * @return  {string}       The corresponding CodeMirror mode. Defaults to multiplex
 */
function resolveMode (ext: string): 'stex'|'yaml'|'javascript'|'multiplex' {
  switch (ext) {
    case '.tex':
      return 'stex'
    case '.yaml':
    case '.yml':
      return 'yaml'
    case '.json':
      return 'javascript'
    default:
      return 'multiplex'
  }
}

/**
 * Retrieves a Markdown document from main and returns a MainEditorMainEditorDocumentWrapper.
 *
 * @return  {MainEditorDocumentWrapper}  The document, wrapped for consumption
 */
export default async function retrieveDocumentFromMain (
  filePath: string,
  fileExt: string,
  shouldCountChars: boolean,
  autoSave: string,
  saveCallback: (doc: MainEditorDocumentWrapper) => void
): Promise<MainEditorDocumentWrapper> {
  const descriptorWithContent = await ipcRenderer.invoke('application', {
    command: 'get-file-contents',
    payload: filePath
  })

  const mode = resolveMode(fileExt)

  const newDoc: MainEditorDocumentWrapper = {
    path: descriptorWithContent.path,
    dir: descriptorWithContent.dir, // Save the dir to distinguish memory-files from others
    mode: mode, // Save the mode for later swaps
    cmDoc: CodeMirror.Doc(descriptorWithContent.content, mode),
    modified: false,
    lastWordCount: countWords(descriptorWithContent.content, shouldCountChars),
    saveTimeout: undefined // Only used below to save the saveTimeout
  }

  // Listen to change events on the doc, because if the user pastes
  // more than ten words at once, we need to substract it to not
  // mess with the word count.
  newDoc.cmDoc.on('change', (doc, changeObj) => {
    if (changeObj.origin !== 'paste') {
      return
    }

    const newTextWords = countWords(changeObj.text.join(' '), shouldCountChars)
    if (newTextWords > 10) {
      newDoc.lastWordCount = countWords(newDoc.cmDoc.getValue(), shouldCountChars)
    }
  })

  // Implement autosaving
  newDoc.cmDoc.on('change', (doc, changeObj) => {
    // Do not attempt to autosave if it's off or we're dealing with an in-memory file.
    if (autoSave === 'off' || newDoc.dir === ':memory:') {
      return
    }

    if (newDoc.saveTimeout !== undefined) {
      clearTimeout(newDoc.saveTimeout)
      newDoc.saveTimeout = undefined
    }

    // Even "immediately" doesn't save RIGHT after you have typed a
    // character. Rather, we take a 250ms window so that the filesystem
    // won't be too stressed. This should still feel very immediate to
    // the user, since the file will more or less be saved once they
    // stop typing.
    const delay = (autoSave === 'immediately') ? 250 : 5000

    newDoc.saveTimeout = setTimeout(() => {
      saveCallback(newDoc)
      // this.save(newDoc).catch(e => console.error(e))
      newDoc.saveTimeout = undefined
    }, delay)
  })

  return newDoc
}
