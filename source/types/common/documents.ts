import type { TabManagerJSON } from 'source/app/service-providers/documents/document-tree/tab-manager'

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

/**
 * This enum describes supported file types that can be opened in an editor.
 */
export enum DocumentType {
  Markdown = 1,
  YAML,
  JSON,
  LaTeX
}

/**
 * A JSON serializable representation of a document tree leaf
 */
export interface LeafNodeJSON extends TabManagerJSON {
  /**
   * Indicates that this is a leaf
   */
  type: 'leaf'
  /**
   * The ID for this leaf (UUID)
   */
  id: string
}

/**
 * A JSON serializable representation of a document tree branch
 */
export interface BranchNodeJSON {
  /**
   * Indicates that this is a branch
   */
  type: 'branch'
  /**
   * The ID for this branch (UUID)
   */
  id: string
  /**
   * The direction into which this branch splits the tree
   */
  direction: 'horizontal'|'vertical'
  /**
   * A list of all child nodes for this branch
   */
  nodes: Array<LeafNodeJSON|BranchNodeJSON>
  /**
   * The sizes (in percent) of the individual child nodes
   */
  sizes: number[]
}

/**
 * This enumeration contains events emitted by the DocumentsProvider across main
 * and renderer processes
 */
export enum DP_EVENTS {
  // Opening/closing of files
  OPEN_FILE = 'file-opened',
  CLOSE_FILE = 'file-closed',
  FILE_REMOTELY_CHANGED = 'file-remotely-changed',
  FILES_SORTED = 'files-sorted',
  // File status (pinned, modified, ...)
  CHANGE_FILE_STATUS = 'file-status-changed',
  FILE_SAVED = 'file-saved',
  ACTIVE_FILE = 'active-file-changed',
  // Leafs (editor panes)
  NEW_LEAF = 'leaf-created',
  LEAF_CLOSED = 'leaf-deleted',
  // Windows
  NEW_WINDOW = 'window-created',
  WINDOW_CLOSED = 'window-deleted'
}
