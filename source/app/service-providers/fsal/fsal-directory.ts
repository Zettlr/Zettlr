/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FSAL directory functions
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains utility functions for dealing with directories.
 *
 * END HEADER
 */

import path from 'path'
import { promises as fs } from 'fs'
import isDir from '@common/util/is-dir'
import isFile from '@common/util/is-file'
import ignoreDir from '@common/util/ignore-dir'
import safeAssign from '@common/util/safe-assign'
import pathExists from '@common/util/path-exists'

import * as FSALFile from './fsal-file'
import * as FSALCodeFile from './fsal-code-file'
import * as FSALAttachment from './fsal-attachment'
import type { DirDescriptor, AnyDescriptor, MDFileDescriptor, SortMethod, ProjectSettings } from '@dts/common/fsal'
import type FSALCache from './fsal-cache'
import { safeDelete } from './util/safe-delete'
import { getFilesystemMetadata } from './util/get-fs-metadata'
import type LogProvider from '@providers/log'
import { hasCodeExt, hasMarkdownExt } from '@common/util/file-extention-checks'

/**
 * Determines what will be written to file (.ztr-directory)
 */
const SETTINGS_TEMPLATE = {
  sorting: 'name-up' as SortMethod,
  project: null as ProjectSettings|null, // Default: no project
  icon: null as null|string // Default: no icon
}

/**
 * Used to insert a default project
 */
const PROJECT_TEMPLATE: ProjectSettings = {
  // General values that not only pertain to the PDF generation
  title: 'Untitled', // Default project title is the directory's name
  profiles: [], // NOTE: Must correspond to the defaults in ProjectProperties.vue
  files: [], // A list of absolute paths to the files to be included, sorted (!)
  cslStyle: '', // A path to an optional CSL style file.
  templates: {
    tex: '', // An optional tex template
    html: '' // An optional HTML template
  }
}

/**
 * Sorts the children-property of "dir". NOTE that this is an internal helper
 * function to ensure possible API changes are properly respected in the future.
 *
 * @param   {DirDescriptor}  dir  A directory descriptor
 */
function sortChildren (
  dir: DirDescriptor,
  sorter: (arr: AnyDescriptor[], sortingType?: SortMethod) => AnyDescriptor[]
): void {
  dir.children = sorter(dir.children, dir.settings.sorting)
}

/**
 * This function checks if a directory has the default settings. This can be
 * useful to determine, if, e.g., the corresponding dotfile will be removed
 * after removing its project settings.
 *
 * @param   {DirDescriptor}  dir  The directory to check
 *
 * @return  {boolean}             Returns true if the settings are the same as default.
 */
export function hasDefaultSettings (dir: DirDescriptor): boolean {
  return JSON.stringify(dir.settings) === JSON.stringify(SETTINGS_TEMPLATE)
}

/**
 * Persists the settings of a directory to disk.
 *
 * @param   {DirDescriptor}  dir  The directory descriptor
 */
async function persistSettings (dir: DirDescriptor): Promise<void> {
  const settingsFile = path.join(dir.path, '.ztr-directory')
  if (hasDefaultSettings(dir) && isFile(settingsFile)) {
    // Only persist the settings if they are not default. If they are default,
    // remove a possible .ztr-directory-file
    try {
      await fs.unlink(settingsFile)
    } catch (err: any) {
      err.message = `Error removing default .ztr-directory: ${err.message as string}`
      throw err
    }
  }
  await fs.writeFile(settingsFile, JSON.stringify(dir.settings))
}

/**
 * Parses a settings file for the given directory.
 *
 * @param   {DirDescriptor}  dir  The directory descriptor.
 */
async function parseSettings (dir: DirDescriptor): Promise<void> {
  const configPath = path.join(dir.path, '.ztr-directory')
  try {
    let settings: string|typeof SETTINGS_TEMPLATE = await fs.readFile(configPath, { encoding: 'utf8' })
    settings = JSON.parse(settings) as typeof SETTINGS_TEMPLATE
    dir.settings = safeAssign(settings, SETTINGS_TEMPLATE)
    if (settings.project !== null) {
      // We have a project, so we need to sanitize the values (in case
      // that there have been changes to the config). We'll just use
      // the code from the config provider.
      dir.settings.project = safeAssign(settings.project, PROJECT_TEMPLATE)
    }
    if (JSON.stringify(dir.settings) === JSON.stringify(SETTINGS_TEMPLATE)) {
      // The settings are the default, so no need to write them to file
      await fs.unlink(configPath)
    }
  } catch (err: any) {
    // Something went wrong. Unlink the malformed file. Do not throw an error
    // since a malformed settings file should never stop loading a directory.
    await fs.unlink(configPath)
  }
}

/**
 * Reads in a directory, returning a corresponding descriptor object. By default
 * this function reads in the entire directory tree recursively which may take
 * some time. If you only need the actual directory descriptor, pass `shallow`
 * as true to prevent it from recursively parsing the tree.
 *
 * @param   {string}              currentPath  The directory's path
 * @param   {FSALCache}           cache        The FSAL cache object
 * @param   {Function}            parser       A MD file parser
 * @param   {Function}            sorter       A directory child sorter function
 * @param   {boolean}             isRoot       Whether this descriptor is a root
 * @param   {boolean}             shallow      If false, children list will not
 *                                             be parsed
 *
 * @return  {Promise<DirDescriptor>}           Resolves with the descriptor
 */
export async function parse (
  currentPath: string,
  cache: FSALCache,
  parser: (file: MDFileDescriptor, content: string) => void,
  sorter: (arr: AnyDescriptor[], sortingType?: SortMethod) => AnyDescriptor[],
  isRoot: boolean,
  shallow: boolean = false
): Promise<DirDescriptor> {
  // Prepopulate
  const dir: DirDescriptor = {
    root: isRoot,
    path: currentPath,
    name: path.basename(currentPath),
    dir: path.dirname(currentPath),
    size: 0,
    children: [],
    type: 'directory',
    isGitRepository: false,
    modtime: 0, // You know when something has gone wrong: 01.01.1970
    creationtime: 0,
    settings: JSON.parse(JSON.stringify(SETTINGS_TEMPLATE))
  }

  // Retrieve the metadata
  try {
    const metadata = await getFilesystemMetadata(dir.path)
    dir.modtime = metadata.modtime
    dir.creationtime = metadata.birthtime
  } catch (err: any) {
    err.message = `Error reading metadata for directory ${dir.path}!`
    // Re-throw so that the caller knows something's afoul
    throw err
  }

  // Now parse the directory contents recursively
  const children = await fs.readdir(dir.path)
  for (const child of children) {
    const absolutePath = path.join(dir.path, child)

    if (child === '.ztr-directory') {
      // We got a settings file, so let's try to read it in
      await parseSettings(dir)
      continue // Done!
    } else if (child === '.git' && isDir(absolutePath)) {
      dir.isGitRepository = true
      continue
    } else if (child.startsWith('.')) {
      continue // Ignore hidden files
    }

    // The `shallow` flag indicates that the directory should not be parsed
    // recursively, so we will simply continue here. The reason we do parse the
    // rest of the list here is that the directory file or git may show up at a
    // later point.
    if (shallow) {
      continue
    }

    if (isDir(absolutePath) && !ignoreDir(absolutePath)) {
      const cDir = await parse(absolutePath, cache, parser, sorter, false)
      dir.children.push(cDir)
    } else if (hasMarkdownExt(absolutePath)) {
      const file = await FSALFile.parse(absolutePath, cache, parser, false)
      dir.children.push(file)
    } else if (hasCodeExt(absolutePath)) {
      const file = await FSALCodeFile.parse(absolutePath, cache, false)
      dir.children.push(file)
    } else if (isFile(absolutePath)) {
      dir.children.push(await FSALAttachment.parse(absolutePath))
    } // Else: Probably a symlink TODO
  }

  // Finally sort and return the directory object
  sortChildren(dir, sorter)
  return dir
}

/**
 * Returns a dummy descriptor that only contains aminimal amount of information
 * along with setting the dirNotFoundFlag to true.
 *
 * @param   {string}         dirPath  The (not found) directory's path
 *
 * @return  {DirDescriptor}           The resulting descriptor
 */
export function getDirNotFoundDescriptor (dirPath: string): DirDescriptor {
  return {
    root: true, // Not found directories are always roots
    path: dirPath,
    name: path.basename(dirPath),
    dir: path.dirname(dirPath),
    size: 0,
    children: [], // Always empty
    type: 'directory',
    isGitRepository: false,
    modtime: 0, // ¯\_(ツ)_/¯
    creationtime: 0,
    // Settings are expected by some functions
    settings: JSON.parse(JSON.stringify(SETTINGS_TEMPLATE)),
    dirNotFoundFlag: true
  }
}

/**
 * Safely assigns an arbitrary settings object to dirObject's settings.
 *
 * @param   {DirDescriptor}  dirObject  The directory descriptor in question.
 * @param   {any}            settings   A settings object to be assigned
 */
export async function setSetting (dirObject: DirDescriptor, settings: Partial<DirDescriptor['settings']>): Promise<void> {
  dirObject.settings = safeAssign(settings, dirObject.settings)
  await persistSettings(dirObject)
}

/**
 * Sorts the given dirObject according to the sorting method
 *
 * @param   {DirDescriptor}  dirObject  The directory object
 * @param   {string}         method     The sorting method
 */
export async function sort (
  dirObject: DirDescriptor,
  sorter: (arr: AnyDescriptor[], sortingType?: SortMethod) => AnyDescriptor[],
  method?: SortMethod
): Promise<void> {
  // If the caller omits the method, it should remain unchanged
  if (method === undefined) {
    method = dirObject.settings.sorting
  }

  dirObject.settings.sorting = method
  // Persist the settings to disk
  await persistSettings(dirObject)
  sortChildren(dirObject, sorter)
}

/**
 * Creates a project from the given dirObject.
 *
 * @param   {DirDescriptor}  dirObject   The directory descriptor
 * @param   {any}            properties  Initial properties to set
 */
export async function makeProject (dirObject: DirDescriptor, properties: Partial<ProjectSettings>): Promise<void> {
  dirObject.settings.project = safeAssign(properties, PROJECT_TEMPLATE)
  await persistSettings(dirObject)
}

/**
 * Updates the project properties of the given directory and immediately persists
 * them to disk. The properties are assigned safely.
 *
 * @param   {DirDescriptor}  dirObject   The directory descriptor
 * @param   {any}            properties  The properties to set
 *
 * @return {boolean}                     Returns false if no properties changed
 */
export async function updateProjectProperties (dirObject: DirDescriptor, properties: ProjectSettings): Promise<void> {
  if (dirObject.settings.project === null) {
    throw new Error(`[FSAL Dir] Attempted to update project settings on dir ${dirObject.path}, but it is not a project!`)
  }

  dirObject.settings.project = safeAssign(properties, dirObject.settings.project)
  // Immediately reflect on disk
  await persistSettings(dirObject)
}

// Removes a project
/**
 * Removes an existing project from the dirObject.
 *
 * @param   {DirDescriptor}  dirObject  The directory descriptor
 */
export async function removeProject (dirObject: DirDescriptor): Promise<void> {
  dirObject.settings.project = null
  await persistSettings(dirObject)
}

/**
 * Creates a new directory within the given descriptor.
 *
 * @param   {DirDescriptor}  dirObject  The source directory
 * @param   {string}         newName    The name for the new directory
 * @param   {FSALCache}      cache      The cache object
 */
export async function createDirectory (
  dirObject: DirDescriptor,
  newName: string,
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[]
): Promise<void> {
  if (newName.trim() === '') {
    throw new Error('Invalid directory name provided!')
  }

  const existingDir = dirObject.children.find(elem => elem.name === newName)
  if (existingDir !== undefined) {
    throw new Error(`A child with name ${newName} already exists!`)
  }

  const newPath = path.join(dirObject.path, newName)
  await fs.mkdir(newPath)
  const metadata = await getFilesystemMetadata(newPath)

  const newDir: DirDescriptor = {
    root: false,
    type: 'directory',
    isGitRepository: false,
    modtime: metadata.modtime,
    creationtime: metadata.birthtime,
    size: 0,
    children: [],
    path: newPath,
    name: newName,
    dir: dirObject.path,
    settings: JSON.parse(JSON.stringify(SETTINGS_TEMPLATE))
  }
  // Add the new directory to the source dir
  dirObject.children.push(newDir)
  sortChildren(dirObject, sorter)
}

/**
 * Creates a new file using the given options
 *
 * @param   {DirDescriptor}  dirObject  The directory descriptor
 * @param   {any}            options    Options, containing a name and content property
 * @param   {FSALCache}      cache      The FSAL cache to cache the resulting file
 */
export async function createFile (filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content)
}

/**
 * Renames the dirObject using newName. Please NOTE that this method returns a
 * new descriptor. Due to every single child changing their paths, it is
 * computationally less expensive to simply re-build the tree from scratch.
 *
 * @param   {DirDescriptor}  dirObject      The directory descriptor
 * @param   {string}         oldName        The directory's old name
 * @param   {string}         newName        The directory's new name
 * @param   {FSALCache}      cache          The FSAL cache object
 * @param   {boolean}        forceOverwrite Whether to force overwriting of existing files when renaming to an existant filename
 *
 * @return  {Promise<DirDescriptor>}    Resolves with the new directory descriptor.
 */
export async function renameChild (
  dirObject: DirDescriptor,
  oldName: string,
  newName: string,
  parser: (file: MDFileDescriptor, content: string) => void,
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[],
  cache: FSALCache,
  forceOverwrite: boolean = false
): Promise<void> {
  // If old and new name are the same, no need to rename
  if (newName === oldName) {
    return
  }

  // Check some things beforehand
  if (newName.trim() === '') {
    throw new Error('Invalid name provided!')
  }

  const oldDescriptor = dirObject.children.find(child => child.name === oldName)
  if (oldDescriptor === undefined) {
    throw new Error(`Cannot rename ${oldName}: Not found in ${dirObject.path}.`)
  }

  // Stops renaming if the new file will overwrite an old file and we don't want it to
  if (newName.toLowerCase() !== oldName.toLowerCase() || !forceOverwrite) {
    const foundName = dirObject.children.find(child => child.name.toLowerCase() === newName.toLowerCase())
    if (foundName !== undefined) {
      throw new Error(`Cannot rename ${oldName} to ${newName}: A file with the same name already exists!`)
    }
  }

  const newPath = path.join(dirObject.path, newName)
  await fs.rename(oldDescriptor.path, newPath)

  // Remove the old descriptor
  dirObject.children.splice(dirObject.children.indexOf(oldDescriptor), 1)

  // Add the new descriptor
  if (isDir(newPath)) {
    // Rescan the new dir to get all new file information
    const descriptor = await parse(newPath, cache, parser, sorter, false)
    dirObject.children.push(descriptor)
  } else if (hasMarkdownExt(newPath)) {
    const descriptor = await FSALFile.parse(newPath, cache, parser, false)
    dirObject.children.push(descriptor)
  } else if (hasCodeExt(newPath)) {
    const descriptor = await FSALCodeFile.parse(newPath, cache, false)
    dirObject.children.push(descriptor)
  } else {
    const descriptor = await FSALAttachment.parse(newPath)
    dirObject.children.push(descriptor)
  }

  // Sort the children
  sortChildren(dirObject, sorter)
}

/**
 * Moves a descriptor into the targetDir.
 *
 * @param   {AnyDescriptor}  sourceObject  A file or directory descriptor to be moved.
 * @param   {DirDescriptor}  targetDir     The target directory of this operation.
 * @param   {FSALCache}      cache         The cache object.
 */
export async function move (
  sourceDir: DirDescriptor,
  sourceObject: AnyDescriptor,
  targetDir: DirDescriptor,
  parser: (file: MDFileDescriptor, content: string) => void,
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[],
  cache: FSALCache
): Promise<void> {
  // Moves anything into the target. We'll use fs.rename for that.
  // Luckily, it doesn't care if it's a directory or a file, so just
  // stuff the path into that.
  let sourcePath = sourceObject.path
  let targetPath = path.join(targetDir.path, sourceObject.name)
  await fs.rename(sourcePath, targetPath)

  // Now remove the source from its parent (which in any case is a directory)
  sourceDir.children.splice(sourceDir.children.indexOf(sourceObject), 1)

  // Re-read the source
  let newSource
  if (sourceObject.type === 'directory') {
    newSource = await parse(targetPath, cache, parser, sorter, false)
  } else if (sourceObject.type === 'file') {
    newSource = await FSALFile.parse(targetPath, cache, parser, false)
  } else if (sourceObject.type === 'code') {
    newSource = await FSALCodeFile.parse(targetPath, cache, false)
  } else {
    newSource = await FSALAttachment.parse(targetPath)
  }

  // Add it to the new target
  targetDir.children.push(newSource)

  // Finally resort the target. Now the state should be good to go.
  sortChildren(targetDir, sorter)
}

export async function addAttachment (dirObject: DirDescriptor, attachmentPath: string): Promise<void> {
  const attachment = await FSALAttachment.parse(attachmentPath)
  dirObject.children.push(attachment)
  // TODO: Sort the attachments afterwards! Generally, I just realised we never sort any of these.
}

export function removeAttachment (dirObject: DirDescriptor, attachmentPath: string): void {
  const idx = dirObject.children.findIndex(element => element.path === attachmentPath)
  dirObject.children.splice(idx, 1)
}

export async function addChild (
  dirObject: DirDescriptor,
  childPath: string,
  parser: (file: MDFileDescriptor, content: string) => void,
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[],
  cache: FSALCache
): Promise<void> {
  if (isDir(childPath)) {
    dirObject.children.push(await parse(childPath, cache, parser, sorter, false))
  } else if (hasCodeExt(childPath)) {
    dirObject.children.push(await FSALCodeFile.parse(childPath, cache, false))
  } else if (hasMarkdownExt(childPath)) {
    dirObject.children.push(await FSALFile.parse(childPath, cache, parser, false))
  }
  sortChildren(dirObject, sorter)
}

export async function removeChild (dirObject: DirDescriptor, childPath: string, deleteOnFail: boolean, logger: LogProvider): Promise<void> {
  const idx = dirObject.children.findIndex(element => element.path === childPath)
  if (idx > -1) {
    // NOTE: This function may be called after a file or folder has been deleted. In that
    // case the function only needs to remove the file or folder from the list of children
    // to avoid safeDelete throwing an error as the file or folder does no longer exist.
    if (await pathExists(childPath)) {
      await safeDelete(childPath, deleteOnFail, logger)
    }

    dirObject.children.splice(idx, 1)
  }
}
