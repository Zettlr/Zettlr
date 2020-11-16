/**
 * Copies over the testing directory
 *
 * @param {String} The absolute path to the destination folder
 *
 * @return  {String[]}  The absolute paths of all roots
 */

const fs = require('fs').promises
const path = require('path')
const log = require('../console-colour')
const isDir = require('../../source/common/util/is-dir')

module.exports = async (destinationPath) => {
  let sourcePath = path.join(__dirname, 'test-files')

  await copyRecursive(sourcePath, destinationPath)

  // Finally, retrieve the roots so that they can be added to the config
  let roots = await fs.readdir(destinationPath)

  // Return the absolute paths
  return roots.map(root => { return path.join(destinationPath, root) })
}

/**
 * Copies a full directory recursively from the source to the target
 *
 * @param   {String}  currentPath  The absolute path to the source directory
 * @param   {String}  targetPath   The absolute path to the target directory
 */
async function copyRecursive (currentPath, targetPath) {
  log.verbose(`Copying ${currentPath} ...`)
  if (!await isDir(currentPath)) {
    await fs.copyFile(currentPath, targetPath)
  } else {
    try {
      await fs.mkdir(targetPath) // Create the directory immediately
    } catch (e) {
      log.verbose('Could not create directory, as it already exists.')
    }

    let children = await fs.readdir(currentPath)
    for (let child of children) {
      await copyRecursive(
        path.join(currentPath, child),
        path.join(targetPath, child)
      )
    } // END for
  } // END else
}
