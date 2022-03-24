/**
 * Copies over the testing directory
 *
 * @param {String} The absolute path to the destination folder
 *
 * @return  {String[]}  The absolute paths of all roots
 */

import { promises as fs, lstatSync } from 'fs'
import { join, dirname } from 'path'
import { verbose } from '../console-colour.mjs'

const __dirname = dirname(import.meta.url.substring(7))

const isDir = function isDir (p) {
  try {
    let s = lstatSync(p)
    return s.isDirectory()
  } catch (err) {
    return false
  }
}


export default async (destinationPath) => {
  let sourcePath = join(__dirname, 'test-files')

  await copyRecursive(sourcePath, destinationPath)

  // Finally, retrieve the roots so that they can be added to the config
  let roots = await fs.readdir(destinationPath)

  // Return the absolute paths
  return roots.map(root => { return join(destinationPath, root) })
}

/**
 * Copies a full directory recursively from the source to the target
 *
 * @param   {String}  currentPath  The absolute path to the source directory
 * @param   {String}  targetPath   The absolute path to the target directory
 */
async function copyRecursive (currentPath, targetPath) {
  verbose(`Copying ${currentPath} ...`)
  if (!await isDir(currentPath)) {
    await fs.copyFile(currentPath, targetPath)
  } else {
    try {
      await fs.mkdir(targetPath) // Create the directory immediately
    } catch (e) {
      verbose('Could not create directory, as it already exists.')
    }

    let children = await fs.readdir(currentPath)
    for (let child of children) {
      await copyRecursive(
        join(currentPath, child),
        join(targetPath, child)
      )
    } // END for
  } // END else
}
