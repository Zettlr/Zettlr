/**
 * This file contains all types which the FSAL exclusively provides and needs:
 *
 * - DescriptorType
 *   A simple enum for more elegant type checking of the descriptors
 *
 * - WatchdogEvent
 *   Enables type checking of ignored and processed watchdog events
 *
 * - FSMetaInfo
 *   Holds all meta information we can extract for both files and directories
 *
 * - DirDescriptor, MDFileDescriptor, TexFileDescriptor, OtherFileDescriptor
 *   Describes specific information for dirs, files, and attachments
 *
 * - DirMeta, MdFileMeta, TexFileMeta, OtherFileMeta
 *   The corresponding meta descriptors (plus content, but sans the circular
 *   parent reference)
 *
 * - AnyDescriptor, MaybeRootDescriptor, AnyMetaDescriptor, MaybeRootMeta
 *   Convenience types for those cases where we don't care which type of
 *   descriptor we have (Any includes other files, MaybeRoot not)
 */

/**
 * Represents an event the watchdog can work with
 */
export interface WatchdogEvent {
  event: string
  path: string
}

/**
 * An interface containing meta information all
 * descriptors should provide.
 */
interface FSMetaInfo {
  name: string // path.basename(absolutePath)
  dir: string // path.dirname(absolutePath)
  path: string // absolutePath
  hash: number // Hashed absolute path
  type: 'file' | 'directory' | 'code' | 'other'
  size: number
  modtime: number
  creationtime: number
}

/**
 * The FSAL directory descriptor
 */
export interface DirDescriptor extends FSMetaInfo {
  parent: DirDescriptor|null
  _settings: {
    sorting: 'name-up'|'name-down'|'time-up'|'time-down'
    icon: string
    project: {
      title: 'string'
      formats: string[]
      filters: string[]
      cslStyle: string
    }|null
  }
  type: 'directory'
  children: Array<MDFileDescriptor|DirDescriptor|CodeFileDescriptor>
  attachments: OtherFileDescriptor[]
  dirNotFoundFlag?: boolean // If the flag is set & true this directory has not been found
}

/**
 * The FSAL Markdown file descriptor
 */
export interface MDFileDescriptor extends FSMetaInfo {
  parent: DirDescriptor|null
  ext: string
  id: string
  type: 'file'
  tags: string[]
  bom: string // An optional BOM
  wordCount: number
  charCount: number
  target: WritingTarget|undefined
  firstHeading: string|null
  frontmatter: any|null
  linefeed: string
  modified: boolean
}

/**
 * The FSAL code file descriptor (.tex, .yml)
 */
export interface CodeFileDescriptor extends FSMetaInfo {
  parent: DirDescriptor|null
  ext: string
  type: 'code'
  id: string
  tags: string[]
  bom: string // An optional BOM
  linefeed: string
  modified: boolean
}

/**
 * The FSAL other (non-MD and non-Tex) file descriptor
 */
export interface OtherFileDescriptor extends FSMetaInfo {
  parent: DirDescriptor
  type: 'other'
  ext: string
}

/**
 * Represents a non-circular directory
 */
export interface DirMeta extends FSMetaInfo {
  parent: number|null
  attachments: OtherFileMeta[]
  children: Array<DirMeta|MDFileMeta|CodeFileMeta>
  project: any
  type: 'directory'
  sorting: string
  icon: string
  dirNotFoundFlag?: boolean // If the flag is set & true this directory has not been found
}

/**
 * Represents a non-circular file
 */
export interface MDFileMeta extends FSMetaInfo {
  parent: number|null
  ext: string
  id: string
  type: 'file'
  tags: string[]
  wordCount: number
  charCount: number
  target: any // TODO
  firstHeading: string|null
  frontmatter: any|null
  linefeed: string
  modified: boolean
  content: string
}

/**
 * Represents a non-circular code file (.tex or .yml)
 */
export interface CodeFileMeta extends FSMetaInfo {
  parent: number|null
  type: 'code'
  linefeed: string
  modified: boolean
  ext: string
  content: string
}

/**
 * Represents a non-circular attachment
 */
export interface OtherFileMeta extends FSMetaInfo {
  parent: number
  type: 'other'
  ext: string
}

// Convenience types to prevent too much typing:
// - AnyDescriptor: Anything that looks like a descriptor
export type AnyDescriptor = DirDescriptor | MDFileDescriptor | CodeFileDescriptor | OtherFileDescriptor
// Anything that can also be a root
export type MaybeRootDescriptor = DirDescriptor | MDFileDescriptor | CodeFileDescriptor
// The same, only for meta descriptors
export type AnyMetaDescriptor = DirMeta | MDFileMeta | CodeFileMeta | OtherFileMeta
export type MaybeRootMeta = DirMeta | MDFileMeta
