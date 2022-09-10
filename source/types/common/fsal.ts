// FSAL types available in both main process and renderer process

export interface ProjectSettings {
  title: string
  profiles: string[]
  filters: string[]
  cslStyle: string
  templates: {
    tex: string
    html: string
  }
}

/**
 * Declares an event that happens on the FSAL
 */
export interface FSALHistoryEvent {
  event: 'add'|'change'|'remove'
  path: string
  timestamp: number
}

/**
 * An interface containing meta information all
 * descriptors should provide.
 */
export interface FSMetaInfo {
  path: string // absolutePath
  dir: string // path.dirname(absolutePath)
  name: string // path.basename(absolutePath)
  root: boolean // Whether the file/dir is a root (relative to Zettlr)
  type: 'file' | 'directory' | 'code' | 'other'
  size: number
  modtime: number
  creationtime: number
}

/**
 * Represents a non-circular directory
 */
export interface DirMeta extends FSMetaInfo {
  parent: DirMeta|number|null
  children: Array<DirMeta|MDFileMeta|CodeFileMeta|OtherFileMeta>
  project: ProjectSettings|null
  type: 'directory'
  isGitRepository: boolean
  sorting: string
  icon: string
  dirNotFoundFlag?: boolean // If the flag is set & true this directory has not been found
}

/**
 * Represents a non-circular file
 */
export interface MDFileMeta extends FSMetaInfo {
  parent: DirMeta|number|null
  ext: string
  id: string
  type: 'file'
  bom: string
  tags: string[]
  links: string[]
  wordCount: number
  charCount: number
  target: any // TODO
  firstHeading: string|null
  yamlTitle: string|undefined
  frontmatter: any|null
  linefeed: string
  modified: boolean
}

/**
 * Represents a non-circular code file (.tex or .yml)
 */
export interface CodeFileMeta extends FSMetaInfo {
  parent: DirMeta|number|null
  type: 'code'
  linefeed: string
  bom: string
  modified: boolean
  ext: string
}

/**
 * Represents a non-circular attachment
 */
export interface OtherFileMeta extends FSMetaInfo {
  root: false
  type: 'other'
  ext: string
}

export type AnyMetaDescriptor = DirMeta | MDFileMeta | CodeFileMeta | OtherFileMeta
export type MaybeRootMeta = DirMeta | MDFileMeta

export interface FSALStats {
  minChars: number
  maxChars: number
  minWords: number
  maxWords: number
  sumChars: number
  sumWords: number
  meanChars: number
  meanWords: number
  sdChars: number
  sdWords: number
  chars68PercentLower: number
  chars68PercentUpper: number
  chars95PercentLower: number
  chars95PercentUpper: number
  words68PercentLower: number
  words68PercentUpper: number
  words95PercentLower: number
  words95PercentUpper: number
  mdFileCount: number
  codeFileCount: number
  dirCount: number
}
