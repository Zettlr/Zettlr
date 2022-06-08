
/**
 * A wrapper for a document loaded into the main editor.
 */
export interface MainEditorDocumentWrapper {
  /**
   * The full path to the file
   */
  path: string
  /**
   * The directory of the file
   */
  dir: string
  /**
   * The mode for the file, resolved from the extension
   */
  mode: string
  /**
   * The document instance
   */
  cmDoc: CodeMirror.Doc
  /**
   * Holds the modification status
   */
  modified: boolean
  /**
   * The last number of words within this file
   */
  lastWordCount: number
  /**
   * A timeout that is used to autosave the document, if the user so wishes
   */
  saveTimeout: any
}
