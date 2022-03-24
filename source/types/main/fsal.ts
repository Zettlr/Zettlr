// FSAL types used solely in the main process
import { ProjectSettings, FSMetaInfo } from '@dts/common/fsal'
import { WritingTarget } from '@providers/targets'

/**
 * Represents an event the watchdog can work with
 */
export interface WatchdogEvent {
  event: string
  path: string
}

/**
 * The FSAL directory descriptor
 */
export interface DirDescriptor extends FSMetaInfo {
  parent: DirDescriptor|null
  _settings: {
    sorting: 'name-up'|'name-down'|'time-up'|'time-down'
    icon: string
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
  parent: DirDescriptor|null
  ext: string
  id: string
  type: 'file'
  tags: string[]
  links: string[] // Any outlinks declared in the file
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

export type AnyDescriptor = DirDescriptor | MDFileDescriptor | CodeFileDescriptor | OtherFileDescriptor
export type MaybeRootDescriptor = DirDescriptor | MDFileDescriptor | CodeFileDescriptor
