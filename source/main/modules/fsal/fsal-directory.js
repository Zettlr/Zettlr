/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseDirectory function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function reads in a directory tree recursively.
 *
 * END HEADER
 */

const path = require('path')
const fs = require('fs').promises
const hash = require('../../../common/util/hash')
const isDir = require('../../../common/util/is-dir')
const isFile = require('../../../common/util/is-file')
const ignoreDir = require('../../../common/util/ignore-dir')
const ignoreFile = require('../../../common/util/ignore-file')
const isAttachment = require('../../../common/util/is-attachment')

const FSALFile = require('./fsal-file')
const FSALAttachment = require('./fsal-attachment')

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
    let stats = await fs.lstat(currentPath)
    dir.modtime = stats.ctimeMs
  } catch (e) {
    global.log.error(`Error reading metadata for directory ${dir.path}!`, e)
    // Re-throw so that the caller knows something's afoul
    throw new Error(e)
  }

  // Now parse the directory contents recursively
  let children = await fs.readdir(dir.path)
  for (let child of children) {
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
  }
}
