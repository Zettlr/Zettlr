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

const parseFile = require('./fsal-parseFile')
const parseAttachment = require('./fsal-parseAttachment')

async function readTree (currentPath, cache) {
  // Prepopulate
  let dir = {
    'path': currentPath,
    'name': path.basename(currentPath),
    'hash': hash(currentPath),
    'project': null, // null, if this directory is not a project, and an instance of ZettlrProject, if it is.
    'children': [],
    'attachments': [],
    'type': 'directory',
    'modtime': 0
  }

  // Retrieve the metadata
  try {
    let stats = await fs.lstat(currentPath)
    dir.modtime = stats.mtime.getTime()
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
      dir.attachments.push(await parseAttachment(absolutePath))
    } else if (isFile(absolutePath)) {
      dir.children.push(await parseFile(absolutePath, cache))
    } else if (isDir(absolutePath)) {
      dir.children.push(await readTree(absolutePath, cache))
    }
  }

  return dir
}

module.exports = async function (dirPath, cache) {
  return readTree(dirPath, cache)
}
