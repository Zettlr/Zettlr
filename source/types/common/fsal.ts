// FSAL types available in both main process and renderer process

export interface ProjectSettings {
  /**
   * The title of the project, will be used, e.g., as title and filename for
   * projects.
   */
  title: string
  /**
   * A list of project filenames (found in the defaults folder in the app data)
   * to use for export.
   */
  profiles: string[]
  /**
   * A sorted (!) list of project-relative paths to the files that should be
   * included in the export of this project, including the ordering in which
   * they should be included.
   */
  files: string[]
  /**
   * An optional, deviating CSL Style to use for citations within this project.
   */
  cslStyle: string
  /**
   * Template files for various export profiles that override any templates
   * provided by the templates themselves.
   */
  templates: {
    tex: string
    html: string
  }
}

/**
 * An interface containing meta information all
 * descriptors should provide.
 */
export interface FSMetaInfo {
  path: string // absolutePath
  dir: string // path.dirname(absolutePath)
  name: string // path.basename(absolutePath)
  type: 'file' | 'directory' | 'code' | 'other'
  size: number
  modtime: number
  creationtime: number
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
  /**
   * Whether the file has been modified by Zettlr.
   * @deprecated Because this should be computed based on the documents provider.
   */
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
  /**
   * Whether the file has been modified by Zettlr.
   * @deprecated Because this should be computed based on the documents provider.
   */
  modified: boolean
}

/**
 * The FSAL other (non-MD and non-Tex) file descriptor
 */
export interface OtherFileDescriptor extends FSMetaInfo {
  type: 'other'
  ext: string
}

export type AnyDescriptor = DirDescriptor | MDFileDescriptor | CodeFileDescriptor | OtherFileDescriptor
export type MaybeRootDescriptor = DirDescriptor | MDFileDescriptor | CodeFileDescriptor
