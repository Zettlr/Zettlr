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

const path = require('path')
const fs = require('fs').promises
const hash = require('../../../common/util/hash')
const sort = require('../../../common/util/sort')
const isDir = require('../../../common/util/is-dir')
const isFile = require('../../../common/util/is-file')
const ignoreDir = require('../../../common/util/ignore-dir')
const ignoreFile = require('../../../common/util/ignore-file')
const isAttachment = require('../../../common/util/is-attachment')

const FSALFile = require('./fsal-file')
const FSALAttachment = require('./fsal-attachment')

/**
 * Determines what will be written to file (.ztr-directory)
 */
const SETTINGS_TEMPLATE = {
  sorting: 'name-up',
  virtualDirectories: [] // Empty array
}

/**
 * Allowed child sorting methods
 */
const SORTINGS = [
  'name-up',
  'name-down',
  'time-up',
  'time-down'
]

/**
 * This function returns a sanitized, non-circular
 * version of dirObject.
 * @param {Object} dirObject A directory descriptor
 */
function metadata (dirObject) {
  // Handle the children
  let children = dirObject.children.map((elem) => {
    if (elem.type === 'directory') {
      return metadata(elem)
    } else if (elem.type === 'file') {
      return FSALFile.metadata(elem)
    }
  })

  return {
    // By only passing the hash, the object becomes
    // both lean AND it can be reconstructed into a
    // circular structure with NO overheads in the
    // renderer.
    'parent': (dirObject.parent) ? dirObject.parent.hash : null,
    'path': dirObject.path,
    'name': dirObject.name,
    'hash': dirObject.hash,
    // The project itself is not needed, renderer only checks if it equals
    // null, or not (then it means there is a project)
    'project': (dirObject.project) ? true : null,
    'children': children,
    'attachments': dirObject.attachments.map(elem => FSALAttachment.metadata(elem)),
    'type': dirObject.type,
    'sorting': dirObject._settings.sorting,
    'modtime': dirObject.modtime
  }
}

/**
 * Sorts the children-property of "dir"
 * @param {Object} dir A directory descriptor
 */
function sortChildren (dir) {
  dir.children = sort(dir.children, dir._settings.sorting)
}

/**
 * Persists the settings of a directory to disk.
 * @param {Object} dir The directory descriptor
 */
async function persistSettings (dir) {
  await fs.writeFile(path.join(dir.path, '.ztr-directory'), JSON.stringify(dir._settings))
}

/**
 * Reads in a file tree recursively, returning the directory descriptor object.
 * @param {String} currentPath The current path of the directory
 * @param {FSALCache} cache A cache object so that the files can cache themselves
 * @param {Mixed} parent A parent (or null, if it's a root)
 */
async function readTree (currentPath, cache, parent) {
  // Prepopulate
  let dir = {
    'parent': parent,
    'path': currentPath,
    'name': path.basename(currentPath),
    'hash': hash(currentPath),
    'project': null, // null, if this directory is not a project, and an instance of ZettlrProject, if it is.
    'children': [],
    'attachments': [],
    'type': 'directory',
    'modtime': 0,
    '_settings': {
      'sorting': 'name-up',
      'virtualDirectories': [] // Legacy
    }
  }

  // Retrieve the metadata
  try {
    let stats = await fs.lstat(dir.path)
    dir.modtime = stats.ctimeMs
  } catch (e) {
    global.log.error(`Error reading metadata for directory ${dir.path}!`, e)
    // Re-throw so that the caller knows something's afoul
    throw new Error(e)
  }

  // Now parse the directory contents recursively
  let children = await fs.readdir(dir.path)
  for (let child of children) {
    if (isFile(path.join(dir.path, child)) && child === '.ztr-directory') {
      // We got a settings file, so let's try to read it in
      let configPath = path.join(dir.path, '.ztr-directory')
      try {
        let settings = await fs.readFile(configPath, { encoding: 'utf8' })
        settings = JSON.parse(settings)
        Object.assign(dir._settings, settings)
        if (JSON.stringify(dir._settings) === JSON.stringify(SETTINGS_TEMPLATE)) {
          // The settings are the default, so no need to write them to file
          await fs.unlink(configPath)
        }
      } catch (e) {
        // No (specific) settings
        // As the file exists, but something was wrong, let's remove this remnant.
        await fs.unlink(configPath)
      }
      continue // Nothing further to do
    } // END: Settings file

    // Helper vars
    let absolutePath = path.join(dir.path, child)
    let isInvalidDir = isDir(absolutePath) && ignoreDir(absolutePath)
    let isInvalidFile = isFile(absolutePath) && ignoreFile(absolutePath)

    // Is the child invalid?
    if (isInvalidDir || (isInvalidFile && !isAttachment(absolutePath))) continue

    // Parse accordingly
    if (isAttachment(absolutePath)) {
      dir.attachments.push(await FSALAttachment.parse(absolutePath))
    } else if (isFile(absolutePath)) {
      dir.children.push(await FSALFile.parse(absolutePath, cache, dir))
    } else if (isDir(absolutePath)) {
      dir.children.push(await readTree(absolutePath, cache, dir))
    }
  }

  // Finally sort and return the directory object
  sortChildren(dir)
  return dir
}

module.exports = {
  'parse': async function (dirPath, cache, parent = null) {
    return readTree(dirPath, cache, parent)
  },
  'metadata': function (dirObject) {
    return metadata(dirObject)
  },
  'createFile': async function (dirObject, filename) {
    fs.writeFile(path.join(dirObject.path, filename), '')
    // TODO
    // dirObject.children.push(await FSALFile.parse(path.join(dirObject.path, filename)))
  },
  'sort': async function (dirObject, method) {
    if (!SORTINGS.includes(method)) throw new Error('Unknown sorting: ' + method)
    dirObject._settings.sorting = method
    // Persist the settings to disk
    await persistSettings(dirObject)
    sortChildren(dirObject)
    return dirObject
  }
}
