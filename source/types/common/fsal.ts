// FSAL types available in both main process and renderer process

/**
 * Describes project settings that can be applied to directories.
 */
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
 * Implements basic information for files and folders on the file system.
 */
interface SharedDescriptorData {
  /**
   * The type of the node described by this descriptor.
   */
  type: 'file' | 'directory' | 'code' | 'other'
  /**
   * The absolute path to the node described by this descriptor.
   */
  path: string
  /**
   * The containing directory to the node described by this descriptor.
   */
  dir: string
  /**
   * The file or folder name of the node described by this descriptor.
   */
  name: string
  /**
   * The extension of the file. This can also be a value for directories, e.g.,
   * for app bundles on macOS. It essentially is the part of the file after the
   * last period (e.g., for `program.app` it would be `.app`). It is up to the
   * consumer of such a descriptor to determine if this has any meaning, likely
   * by also checking the `type` property.
   */
  ext: string
  /**
   * The size of the node on the file system in bytes
   */
  size: number
  /**
   * When the node was last modified.
   */
  modtime: number
  /**
   * When the node was created.
   */
  creationtime: number
}

/**
 * Describes an incomplete file descriptor, where "incomplete" means that the
 * file has not been completely parsed. This means this descriptor contains all
 * required data that is stored by the filesystem, but not yet any data derived
 * from the actual file contents.
 */
export interface IncompleteFileDescriptor extends SharedDescriptorData {
  /**
   * This descriptor is not complete as in: Not completely parsed.
   */
  complete: false
  /**
   * This descriptor describes a file.
   */
  type: 'file'|'code'|'other'
}

/**
 * Describes an incomplete directory descriptor, where "incomplete" means that
 * the directory has not been completely parsed. This means this descriptor
 * contains all required data that is stored by the filesystem, but not yet any
 * data derived from the actual directory contents.
 */
export interface IncompleteDirDescriptor extends SharedDescriptorData {
  /**
   * This descriptor is not complete as in: Not completely parsed.
   */
  complete: false
  /**
   * This descriptor describes a directory.
   */
  type: 'directory'
}

/**
 * This interface describes an incomplete filesystem node. This means it
 * contains filesystem metadata about the descriptor, but no data that needs to
 * be derived from actually parsing the node (i.e., extracting directory
 * information, or various nodes from Markdown content).
 *
 * If you need more specific `IncompleteDescriptor` variants, consider using
 * `IncompleteFileDescriptor` or `IncompleteDirDescriptor`.
 */
export type IncompleteDescriptor = IncompleteFileDescriptor|IncompleteDirDescriptor

/**
 * A recognized method to sort a directory.
 */
export type SortMethod = 'name-up'|'name-down'|'time-up'|'time-down'

/**
 * Describes a directory and includes parsed data.
 */
export interface DirDescriptor extends SharedDescriptorData {
  /**
   * Settings for this directory that the app should respect. Stored in
   * `.ztr-directory`-files at the directory root.
   */
  settings: {
    /**
     * How to sort this directory in the GUI
     */
    sorting: SortMethod
    /**
     * A custom icon to display in the file manager
     */
    icon: string|null
    /**
     * Contains the project settings, if this directory is a project.
     */
    project: ProjectSettings|null
  }
  /**
   * The type of this descriptor
   */
  type: 'directory'
  /**
   * Whether this directory contains a `git`-repository
   */
  isGitRepository: boolean
  /**
   * This is present and true for workspaces defined in the configuration that
   * have not been found. This can be the case if the user has their data on a
   * removable drive and that drive is not inserted into the computer.
   */
  dirNotFoundFlag?: boolean
  /**
   * Determines whether the descriptor contains parsed data, or merely the basic
   * file system metadata.
   */
  complete: true
}

/**
 * Describes a Markdown-file, and includes information retrieved by parsing the
 * file contents.
 */
export interface MDFileDescriptor extends SharedDescriptorData {
  /**
   * The file's Zettelkasten ID.
   */
  id: string
  /**
   * The type of this descriptor.
   */
  type: 'file'
  /**
   * A list of all tags found in the file
   */
  tags: string[]
  /**
   * A list of all links to other files found in this file.
   */
  links: string[]
  /**
   * A list of all IDs for references cited within the file.
   */
  citekeys: string[]
  /**
   * The byte order mark (BOM) of the file. Can be an empty string.
   */
  bom: string
  /**
   * The current word count of this file.
   */
  wordCount: number
  /**
   * The current character count of this file.
   */
  charCount: number
  /**
   * The first heading level 1, if present.
   */
  firstHeading: string|null
  /**
   * The `title` property of the YAML frontmatter, if present.
   */
  yamlTitle: string|undefined
  /**
   * A parsed version of the YAML frontmatter, if present.
   */
  frontmatter: any|null
  /**
   * The native linefeed used in the file.
   */
  linefeed: string
  /**
   * Determines whether the descriptor contains parsed data, or merely the basic
   * file system metadata.
   */
  complete: true
}

/**
 * Describes a code-file (i.e., a subset of recognized plain-text non-Markdown
 * files that Zettlr accepts).
 */
export interface CodeFileDescriptor extends SharedDescriptorData {
  /**
   * The type of this descriptor
   */
  type: 'code'
  /**
   * The byte order mark (BOM) of the file. Can be an empty string.
   */
  bom: string
  /**
   * The native linefeed used in the file.
   */
  linefeed: string
  /**
   * Determines whether the descriptor contains parsed data, or merely the basic
   * file system metadata.
   */
  complete: true
}

/**
 * The FSAL other (non-MD and non-Tex) file descriptor
 */
export interface OtherFileDescriptor extends SharedDescriptorData {
  /**
   * The type of this descriptor.
   */
  type: 'other'
  /**
   * Determines whether the descriptor contains parsed data, or merely the basic
   * file system metadata.
   */
  complete: true
}

/**
 * Convenience type to mean any parsed (read: complete) file descriptor.
 */
export type AnyFileDescriptor = MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor

/**
 * Convenience type to mean any parsed (read: complete) descriptor, including
 * directories.
 */
export type AnyDescriptor = DirDescriptor | AnyFileDescriptor

/**
 * Convenience type to mean any parsed (read: complete) descriptor that can be
 * loaded as a root path (workspace or standalone file).
 */
export type MaybeRootDescriptor = DirDescriptor | MDFileDescriptor | CodeFileDescriptor
