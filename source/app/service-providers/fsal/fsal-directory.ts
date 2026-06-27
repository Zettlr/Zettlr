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
import assert, { AssertionError } from 'assert'
import isFile from '@common/util/is-file'
import safeAssign from '@common/util/safe-assign'

import type { DirDescriptor, SortMethod, ProjectSettings, DirectorySettings, GitBackupSettings } from '@dts/common/fsal'
import { getFilesystemMetadata } from './util/get-fs-metadata'

/**
 * Determines what will be written to file (.ztr-directory)
 */
const SETTINGS_TEMPLATE: DirectorySettings = {
  sorting: 'name-up',
  project: null, // Default: no project
  gitBackup: null, // Default: No git backup
  icon: null, // Default: no icon
  color: null // Default: no color
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
 * Holds default settings for a git backup
 */
const GIT_BACKUP_TEMPLATE: GitBackupSettings = {
  backupFrequency: 'hourly'
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new Error(`Error removing default .ztr-directory: ${err.message as string}`)
      } else {
        throw new Error('Error removing default .ztr-directory')
      }
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
    const settingsText = await fs.readFile(configPath, { encoding: 'utf8' })
    const settings = JSON.parse(settingsText) as typeof SETTINGS_TEMPLATE

    dir.settings = safeAssign(settings, SETTINGS_TEMPLATE)

    // If the directory has a project or git backup strategy defined, safely
    // assign the config options here.
    if (settings.project !== null) {
      dir.settings.project = safeAssign(settings.project, PROJECT_TEMPLATE)
    }

    if (settings.gitBackup !== null) {
      dir.settings.gitBackup = safeAssign(settings.gitBackup, GIT_BACKUP_TEMPLATE)
    }

    try {
      assert.deepStrictEqual(dir.settings, SETTINGS_TEMPLATE)
      // The settings are the default, so no need to write them to file
      await fs.unlink(configPath)
    } catch (err: unknown) {
      if (err instanceof AssertionError) {
        // Settings are non-default -> all good, and expected.
      } else {
        throw err // Something else went wrong
      }
    }
  } catch (err: unknown) {
    // Ignore file-not-found errors
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return
    }

    // Something went wrong. Unlink the malformed file. Do not throw an error
    // since a malformed settings file should never stop loading a directory.
    await fs.unlink(configPath)
  }
}

/**
 * Reads in a directory, returning a corresponding descriptor object. Does NOT
 * read in the entire sub-tree of the filesystem.
 *
 * @param   {string}              currentPath  The directory's path
 *
 * @return  {Promise<DirDescriptor>}           Resolves with the descriptor
 */
export async function parse (currentPath: string): Promise<DirDescriptor> {
  // Prepopulate
  const dir: DirDescriptor = {
    path: currentPath,
    name: path.basename(currentPath),
    dir: path.dirname(currentPath),
    size: 0,
    type: 'directory',
    isGitRepository: false,
    modtime: 0, // You know when something has gone wrong: 01.01.1970
    creationtime: 0,
    settings: JSON.parse(JSON.stringify(SETTINGS_TEMPLATE))
  }

  try {
    dir.isGitRepository = (await fs.lstat(path.join(dir.path, '.git'))).isDirectory()
  } catch (err: unknown) {}

  // Retrieve the metadata
  try {
    const metadata = await getFilesystemMetadata(dir.path)
    dir.modtime = metadata.modtime
    dir.creationtime = metadata.birthtime
    await parseSettings(dir)
  } catch (err: unknown) {
    throw new Error(`Error reading metadata for directory ${dir.path}!`)
  }

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
    path: dirPath,
    name: path.basename(dirPath),
    dir: path.dirname(dirPath),
    size: 0,
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
export async function changeSorting (dirObject: DirDescriptor, method?: SortMethod): Promise<void> {
  // If the caller omits the method, it should remain unchanged
  if (method === undefined) {
    method = dirObject.settings.sorting
  }

  dirObject.settings.sorting = method
  // Persist the settings to disk
  await persistSettings(dirObject)
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
 */
export async function updateProjectProperties (dirObject: DirDescriptor, properties: ProjectSettings): Promise<void> {
  if (dirObject.settings.project === null) {
    throw new Error(`[FSAL Dir] Attempted to update project settings on dir ${dirObject.path}, but it is not a project!`)
  }

  dirObject.settings.project = safeAssign(properties, dirObject.settings.project)
  // Immediately reflect on disk
  await persistSettings(dirObject)
}

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
 * Creates a new git backup strategy for the directory
 *
 * @param   {DirDescriptor}  dirObject   The directory descriptor
 * @param   {any}            properties  Initial properties to set
 */
export async function createGitBackupStrategy (dirObject: DirDescriptor, properties: Partial<GitBackupSettings>): Promise<void> {
  dirObject.settings.gitBackup = safeAssign(properties, GIT_BACKUP_TEMPLATE)
  await persistSettings(dirObject)
}

/**
 * Updates the git backup settings of the given directory and immediately
 * persists them to disk.
 *
 * @param   {DirDescriptor}  dirObject   The directory descriptor
 * @param   {any}            properties  The properties to set
 */
export async function updateGitBackupSettings (dirObject: DirDescriptor, properties: GitBackupSettings): Promise<void> {
  if (dirObject.settings.gitBackup === null) {
    throw new Error(`[FSAL Dir] Attempted to update git backup settings on dir ${dirObject.path}, but git backups are not defined!`)
  }

  dirObject.settings.gitBackup = safeAssign(properties, dirObject.settings.gitBackup)
  // Immediately reflect on disk
  await persistSettings(dirObject)
}

/**
 * Removes an existing git backup strategy from the dirObject.
 *
 * @param   {DirDescriptor}  dirObject  The directory descriptor
 */
export async function removeGitBackup (dirObject: DirDescriptor): Promise<void> {
  dirObject.settings.gitBackup = null
  await persistSettings(dirObject)
}
