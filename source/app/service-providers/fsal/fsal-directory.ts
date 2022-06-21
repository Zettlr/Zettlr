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
import hash from '@common/util/hash'
import isDir from '@common/util/is-dir'
import isFile from '@common/util/is-file'
import ignoreDir from '@common/util/ignore-dir'
import safeAssign from '@common/util/safe-assign'

import { shell } from 'electron'

import * as FSALFile from './fsal-file'
import * as FSALCodeFile from './fsal-code-file'
import * as FSALAttachment from './fsal-attachment'
import { ProjectSettings, DirMeta } from '@dts/common/fsal'
import { DirDescriptor, AnyDescriptor, MaybeRootDescriptor, MDFileDescriptor } from '@dts/main/fsal'
import FSALCache from './fsal-cache'
import {
  codeFileExtensions,
  mdFileExtensions
} from '@providers/fsal/util/valid-file-extensions'
import TagProvider from '@providers/tags'
import TargetProvider from '@providers/targets'
import { isMdOrCodeFile } from './util/is-md-or-code-file'

/**
 * Determines what will be written to file (.ztr-directory)
 */
const SETTINGS_TEMPLATE = {
  sorting: 'name-up',
  project: null, // Default: no project
  icon: null // Default: no icon
}

const ALLOWED_CODE_FILES = codeFileExtensions(true)
const MARKDOWN_FILES = mdFileExtensions(true)

/**
 * Used to insert a default project
 */
const PROJECT_TEMPLATE: ProjectSettings = {
  // General values that not only pertain to the PDF generation
  title: 'Untitled', // Default project title is the directory's name
  profiles: [], // NOTE: Must correspond to the defaults in ProjectProperties.vue
  filters: [], // A list of filters (glob patterns) to exclude certain files
  cslStyle: '', // A path to an optional CSL style file.
  templates: {
    tex: '', // An optional tex template
    html: '' // An optional HTML template
  }
}

/**
 * Allowed child sorting methods
 */
type SortMethod = 'name-up'|'name-down'|'time-up'|'time-down'

/**
 * Sorts the children-property of "dir". NOTE that this is an internal helper
 * function to ensure possible API changes are properly respected in the future.
 *
 * @param   {DirDescriptor}  dir  A directory descriptor
 */
function sortChildren (
  dir: DirDescriptor,
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[]
): void {
  dir.children = sorter(dir.children, dir._settings.sorting)
}

/**
 * This function returns a sanitized, non-circular version of dirObject.
 *
 * @param   {DirDescriptor}  dirObject  A directory descriptor
 *
 * @return  {DirMeta}                   The corresponding meta descriptor
 */
export function metadata (dirObject: DirDescriptor): DirMeta {
  // Handle the children
  const children = dirObject.children.map((elem) => {
    if (elem.type === 'directory') {
      return metadata(elem)
    } else if (elem.type === 'file') {
      return FSALFile.metadata(elem)
    } else if (elem.type === 'code') {
      return FSALCodeFile.metadata(elem)
    } else {
      return FSALAttachment.metadata(elem)
    }
  })

  return {
    // By only passing the hash, the object becomes
    // both lean AND it can be reconstructed into a
    // circular structure with NO overheads in the
    // renderer.
    parent: (dirObject.parent !== null) ? dirObject.parent.hash : null,
    path: dirObject.path,
    dir: dirObject.dir,
    name: dirObject.name,
    hash: dirObject.hash,
    size: dirObject.size,
    // The project itself is not needed, renderer only checks if it equals
    // null, or not (then it means there is a project)
    project: dirObject._settings.project,
    children: children,
    type: dirObject.type,
    isGitRepository: dirObject.isGitRepository,
    sorting: dirObject._settings.sorting,
    icon: dirObject._settings.icon,
    modtime: dirObject.modtime,
    creationtime: dirObject.creationtime,
    // Include the optional dirNotFoundFlag
    dirNotFoundFlag: dirObject.dirNotFoundFlag
  }
}

/**
 * Persists the settings of a directory to disk.
 *
 * @param   {DirDescriptor}  dir  The directory descriptor
 */
async function persistSettings (dir: DirDescriptor): Promise<void> {
  const settingsFile = path.join(dir.path, '.ztr-directory')
  const hasDefaultSettings = JSON.stringify(dir._settings) === JSON.stringify(SETTINGS_TEMPLATE)
  if (hasDefaultSettings && isFile(settingsFile)) {
    // Only persist the settings if they are not default. If they are default,
    // remove a possible .ztr-directory-file
    try {
      await fs.unlink(settingsFile)
    } catch (err: any) {
      err.message = `Error removing default .ztr-directory: ${err.message as string}`
      throw err
    }
  }
  await fs.writeFile(path.join(dir.path, '.ztr-directory'), JSON.stringify(dir._settings))
}

/**
 * Parses a settings file for the given directory.
 *
 * @param   {DirDescriptor}  dir  The directory descriptor.
 */
async function parseSettings (dir: DirDescriptor): Promise<void> {
  const configPath = path.join(dir.path, '.ztr-directory')
  try {
    let settings: any = await fs.readFile(configPath, { encoding: 'utf8' })
    settings = JSON.parse(settings)
    dir._settings = safeAssign(settings, SETTINGS_TEMPLATE)
    if (settings.project !== null) {
      // We have a project, so we need to sanitize the values (in case
      // that there have been changes to the config). We'll just use
      // the code from the config provider.
      dir._settings.project = safeAssign(settings.project, PROJECT_TEMPLATE)
    }
    if (JSON.stringify(dir._settings) === JSON.stringify(SETTINGS_TEMPLATE)) {
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
 * Reads in a file tree recursively, returning the directory descriptor object.
 *
 * @param   {string}              currentPath  The directory's path
 * @param   {FSALCache}           cache        The FSAL cache object
 * @param   {DirDescriptor|null}  parent       An optional parent
 *
 * @return  {Promise<DirDescriptor>}           Resolves with the directory descriptor
 */
export async function parse (
  currentPath: string,
  cache: FSALCache,
  tags: TagProvider,
  targets: TargetProvider,
  parser: (file: MDFileDescriptor, content: string) => void,
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[],
  parent: DirDescriptor|null
): Promise<DirDescriptor> {
  // Prepopulate
  const dir: DirDescriptor = {
    parent: parent,
    path: currentPath,
    name: path.basename(currentPath),
    dir: path.dirname(currentPath),
    size: 0,
    hash: hash(currentPath),
    children: [],
    type: 'directory',
    isGitRepository: false,
    modtime: 0, // You know when something has gone wrong: 01.01.1970
    creationtime: 0,
    _settings: JSON.parse(JSON.stringify(SETTINGS_TEMPLATE))
  }

  // Retrieve the metadata
  try {
    const stats = await fs.lstat(dir.path)
    dir.modtime = stats.ctimeMs
    dir.creationtime = stats.birthtimeMs
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
    }

    if (isDir(absolutePath) && !ignoreDir(absolutePath)) {
      const cDir = await parse(absolutePath, cache, tags, targets, parser, sorter, dir)
      dir.children.push(cDir)
    } else if (isMdOrCodeFile(absolutePath)) {
      const isCode = ALLOWED_CODE_FILES.includes(path.extname(absolutePath).toLowerCase())
      if (isCode) {
        const file = await FSALCodeFile.parse(absolutePath, cache, dir)
        dir.children.push(file)
      } else {
        const file = await FSALFile.parse(absolutePath, cache, parser, targets, tags, dir)
        dir.children.push(file)
      }
    } else if (isFile(absolutePath)) {
      dir.children.push(await FSALAttachment.parse(absolutePath, dir))
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
    parent: null, // Always a root
    path: dirPath,
    name: path.basename(dirPath),
    dir: path.dirname(dirPath),
    hash: hash(dirPath),
    size: 0,
    children: [], // Always empty
    type: 'directory',
    isGitRepository: false,
    modtime: 0, // ¯\_(ツ)_/¯
    creationtime: 0,
    // Settings are expected by some functions
    _settings: JSON.parse(JSON.stringify(SETTINGS_TEMPLATE)),
    dirNotFoundFlag: true
  }
}

/**
 * Safely assigns an arbitrary settings object to dirObject's settings.
 *
 * @param   {DirDescriptor}  dirObject  The directory descriptor in question.
 * @param   {any}            settings   A settings object to be assigned
 */
export async function setSetting (dirObject: DirDescriptor, settings: any): Promise<void> {
  dirObject._settings = safeAssign(settings, dirObject._settings)
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
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[],
  method?: SortMethod
): Promise<void> {
  // If the caller omits the method, it should remain unchanged
  if (method === undefined) {
    method = dirObject._settings.sorting
  }

  dirObject._settings.sorting = method
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
export async function makeProject (dirObject: DirDescriptor, properties: any): Promise<void> {
  dirObject._settings.project = safeAssign(properties, PROJECT_TEMPLATE)
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
export async function updateProjectProperties (dirObject: DirDescriptor, properties: any): Promise<boolean> {
  if (dirObject._settings.project === null) {
    throw new Error(`[FSAL Dir] Attempted to update project settings on dir ${dirObject.path}, but it is not a project!`)
  }

  const titleUnchanged = dirObject._settings.project.title === properties.title
  const cslUnchanged = dirObject._settings.project.cslStyle === properties.cslStyle
  const formatsUnchanged = JSON.stringify(dirObject._settings.project.profiles) === JSON.stringify(properties.profiles)
  const filtersUnchanged = JSON.stringify(dirObject._settings.project.filters) === JSON.stringify(properties.filters)
  const templatesUnchanged = JSON.stringify(dirObject._settings.project.templates) === JSON.stringify(properties.templates)

  if (titleUnchanged && cslUnchanged && formatsUnchanged && filtersUnchanged && templatesUnchanged) {
    return false
  }

  dirObject._settings.project = safeAssign(properties, dirObject._settings.project)
  // Immediately reflect on disk
  await persistSettings(dirObject)
  return true
}

// Removes a project
/**
 * Removes an existing project from the dirObject.
 *
 * @param   {DirDescriptor}  dirObject  The directory descriptor
 */
export async function removeProject (dirObject: DirDescriptor): Promise<void> {
  dirObject._settings.project = null
  await persistSettings(dirObject)
}

/**
 * Creates a new directory within the given descriptor.
 *
 * @param   {DirDescriptor}  dirObject  The source directory
 * @param   {string}         newName    The name for the new directory
 * @param   {FSALCache}      cache      The cache object
 */
export async function create (
  dirObject: DirDescriptor,
  newName: string,
  cache: FSALCache,
  tags: TagProvider,
  targets: TargetProvider,
  parser: (file: MDFileDescriptor, content: string) => void,
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
  const newDir = await parse(newPath, cache, tags, targets, parser, sorter, dirObject)
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
export async function createFile (
  dirObject: DirDescriptor,
  options: any,
  cache: FSALCache,
  targets: TargetProvider,
  tags: TagProvider,
  parser: (file: MDFileDescriptor, content: string) => void,
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[]
): Promise<void> {
  const filename = options.name
  const content = options.content
  const fullPath = path.join(dirObject.path, filename)
  await fs.writeFile(fullPath, content)
  if ('type' in options && options.type === 'code') {
    const file = await FSALCodeFile.parse(fullPath, cache, dirObject)
    dirObject.children.push(file)
  } else {
    const file = await FSALFile.parse(fullPath, cache, parser, targets, tags, dirObject)
    dirObject.children.push(file)
  }
  sortChildren(dirObject, sorter)
}

/**
 * Renames the dirObject using newName. Please NOTE that this method returns a
 * new descriptor. Due to every single child changing their paths, it is
 * computationally less expensive to simply re-build the tree from scratch.
 *
 * @param   {DirDescriptor}  dirObject  The directory descriptor
 * @param   {string}         newName    The directory's new name
 * @param   {FSALCache}      cache      The FSAL cache object
 *
 * @return  {Promise<DirDescriptor>}    Resolves with the new directory descriptor.
 */
export async function rename (
  dirObject: DirDescriptor,
  newName: string,
  tags: TagProvider,
  targets: TargetProvider,
  parser: (file: MDFileDescriptor, content: string) => void,
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[],
  cache: FSALCache
): Promise<DirDescriptor> {
  // Check some things beforehand
  if (newName.trim() === '') {
    throw new Error('Invalid directory name provided!')
  }
  let parentNames = await fs.readdir(path.dirname(dirObject.path))
  if (parentNames.includes(newName)) {
    throw new Error(`Directory ${newName} already exists!`)
  }

  let newPath = path.join(path.dirname(dirObject.path), newName)
  await fs.rename(dirObject.path, newPath)
  // Rescan the new dir to get all new file information
  let newDir = await parse(newPath, cache, tags, targets, parser, sorter, dirObject.parent)
  if (dirObject.parent !== null) {
    // Exchange the directory in the parent
    let index = dirObject.parent.children.indexOf(dirObject)
    dirObject.parent.children.splice(index, 1, newDir)
    // Now sort the parent
    sortChildren(dirObject.parent, sorter)
  }

  // Return the new directory -- either to replace it in the filetree, or,
  // if applicable, the openDirectory
  return newDir
}

/**
 * Removes a directory from disk
 *
 * @param   {DirDescriptor}  dirObject  The directory to remove
 */
export async function remove (dirObject: DirDescriptor, deleteOnFail: boolean): Promise<void> {
  // First, get the parent, if there is any
  let parentDir = dirObject.parent
  try {
    await shell.trashItem(dirObject.path)
  } catch (err: any) {
    if (deleteOnFail) {
      // If this function throws, there's really something off and we shouldn't recover.
      await fs.rmdir(dirObject.path, { recursive: true })
    } else {
      err.message = `[FSAL Directory] Could not remove directory ${dirObject.path}: ${String(err.message)}`
      throw err
    }
  }

  // Now, remove the directory from the file tree as well
  if (parentDir !== null) {
    // Splice it from the parent directory
    parentDir.children.splice(parentDir.children.indexOf(dirObject), 1)
  }
}

/**
 * Moves a descriptor into the targetDir.
 *
 * @param   {AnyDescriptor}  sourceObject  A file or directory descriptor to be moved.
 * @param   {DirDescriptor}  targetDir     The target directory of this operation.
 * @param   {FSALCache}      cache         The cache object.
 */
export async function move (
  sourceObject: AnyDescriptor,
  targetDir: DirDescriptor,
  tags: TagProvider,
  targets: TargetProvider,
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
  let oldChildren = sourceObject.parent?.children
  if (oldChildren !== undefined) {
    oldChildren.splice(oldChildren.indexOf(sourceObject as unknown as MaybeRootDescriptor), 1)
  }

  // Re-read the source
  let newSource
  if (sourceObject.type === 'directory') {
    newSource = await parse(targetPath, cache, tags, targets, parser, sorter, targetDir)
  } else {
    newSource = await FSALFile.parse(targetPath, cache, parser, targets, tags, targetDir)
  }

  // Add it to the new target
  targetDir.children.push(newSource)

  // Finally resort the target. Now the state should be good to go.
  sortChildren(targetDir, sorter)
}

export async function addAttachment (dirObject: DirDescriptor, attachmentPath: string): Promise<void> {
  const attachment = await FSALAttachment.parse(attachmentPath, dirObject)
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
  tags: TagProvider,
  targets: TargetProvider,
  parser: (file: MDFileDescriptor, content: string) => void,
  sorter: (arr: AnyDescriptor[], sortingType?: string) => AnyDescriptor[],
  cache: FSALCache
): Promise<void> {
  if (isDir(childPath)) {
    dirObject.children.push(await parse(childPath, cache, tags, targets, parser, sorter, dirObject))
  } else if (ALLOWED_CODE_FILES.includes(path.extname(childPath))) {
    dirObject.children.push(await FSALCodeFile.parse(childPath, cache, dirObject))
  } else if (MARKDOWN_FILES.includes(path.extname(childPath))) {
    dirObject.children.push(await FSALFile.parse(childPath, cache, parser, targets, tags, dirObject))
  }
  sortChildren(dirObject, sorter)
}

export function removeChild (dirObject: DirDescriptor, childPath: string): void {
  const idx = dirObject.children.findIndex(element => element.path === childPath)
  dirObject.children.splice(idx, 1)
}
