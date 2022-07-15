import countWords from '@common/util/count-words'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import { CodeFileMeta, MDFileMeta } from '@dts/common/fsal'
import { MainEditorDocumentWrapper } from '@dts/renderer/editor'
import CodeMirror from 'codemirror'
import { ComputedRef } from 'vue'

const ipcRenderer = window.ipc
const path = window.path

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
  autoSave: ComputedRef<any>,
  saveCallback: (doc: MainEditorDocumentWrapper) => void
): Promise<MainEditorDocumentWrapper> {
  const mode = resolveMode(fileExt)
  const newDoc: MainEditorDocumentWrapper = {
    path: filePath,
    dir: path.dirname(filePath), // Save the dir to distinguish memory-files from others
    mode: mode, // Save the mode for later swaps
    cmDoc: CodeMirror.Doc('', mode),
    modified: false,
    library: undefined,
    lastWordCount: 0,
    saveTimeout: undefined // Only used below to save the saveTimeout
  }

  const descriptorWithContent: MDFileMeta|CodeFileMeta|undefined = await ipcRenderer.invoke('application', {
    command: 'get-file-contents',
    payload: filePath
  })

  if (descriptorWithContent === undefined) {
    throw new Error(`Descriptor for file ${filePath} was unavailable! Could not load document`)
  }

  newDoc.cmDoc = CodeMirror.Doc(descriptorWithContent.content, mode)
  newDoc.lastWordCount = countWords(descriptorWithContent.content, shouldCountChars)

  if (descriptorWithContent.type === 'file') {
    const bib = descriptorWithContent.frontmatter?.bibliography
    if (bib != null && typeof bib === 'string' && bib.trim() !== '') {
      newDoc.library = bib
    } else {
      // It's an MD file, so we still need a library -> main library
      newDoc.library = CITEPROC_MAIN_DB
    }
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
    if (autoSave.value === 'off') {
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
    const delay = (autoSave.value === 'immediately') ? 250 : 5000

    newDoc.saveTimeout = setTimeout(() => {
      saveCallback(newDoc)
      newDoc.saveTimeout = undefined
    }, delay)
  })

  return newDoc
}
