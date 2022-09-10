// FSAL types used solely in the main process
import { ProjectSettings, FSMetaInfo } from '@dts/common/fsal'

/**
 * Represents an event the watchdog can work with
 */
export interface WatchdogEvent {
  event: string
  path: string
}

export type SortMethod = 'name-up'|'name-down'|'time-up'|'time-down'

/**
 * The FSAL directory descriptor
 */
export interface DirDescriptor extends FSMetaInfo {
  // Settings are properties that must be persisted separately in a
  // .ztr-directory file, since they are not bound to the directory.
  settings: {
    sorting: SortMethod
    icon: string|null
    project: ProjectSettings|null
  }
  type: 'directory'
  isGitRepository: boolean
  children: Array<MDFileDescriptor|DirDescriptor|CodeFileDescriptor|OtherFileDescriptor>
  dirNotFoundFlag?: boolean // If the flag is set & true this directory has not been found
}

/**
 * The FSAL Markdown file descriptor
 */
export interface MDFileDescriptor extends FSMetaInfo {
  ext: string
  id: string
  type: 'file'
  tags: string[]
  links: string[] // Any outlinks declared in the file
  bom: string // An optional BOM
  wordCount: number
  charCount: number
  firstHeading: string|null
  yamlTitle: string|undefined
  frontmatter: any|null
  linefeed: string
  modified: boolean
}

/**
 * The FSAL code file descriptor (.tex, .yml)
 */
export interface CodeFileDescriptor extends FSMetaInfo {
  ext: string
  type: 'code'
  bom: string // An optional BOM
  linefeed: string
  modified: boolean
}

/**
 * The FSAL other (non-MD and non-Tex) file descriptor
 */
export interface OtherFileDescriptor extends FSMetaInfo {
  root: false // Attachments can never be roots
  type: 'other'
  ext: string
}

export type AnyDescriptor = DirDescriptor | MDFileDescriptor | CodeFileDescriptor | OtherFileDescriptor
export type MaybeRootDescriptor = DirDescriptor | MDFileDescriptor | CodeFileDescriptor
