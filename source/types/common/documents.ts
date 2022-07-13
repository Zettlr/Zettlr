/**
 * A descriptor for some metadata that is associated to opened documents, such
 * as pinning status, or an icon.
 */
export interface OpenDocument {
  /**
   * The full path to the document
   */
  path: string
  /**
   * Indicates whether this document should be handled as pinned
   */
  pinned: boolean
  /**
   * An icon that will allow us to save space by associating icons to documents
   * instead of the filenames
   */
  icon?: string
}
