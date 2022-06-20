/**
 * Copies over the testing directory
 *
 * @param {String} The absolute path to the destination folder
 *
 * @return  {String[]}  The absolute paths of all roots
 */

import { promises as fs, lstatSync } from 'fs'
import path from 'path'
import { verbose } from '../console-colour.mjs'

const __dirname = process.platform === 'win32'
  ? path.dirname(decodeURI(import.meta.url.substring(8))) // file:///C:/...
  : path.dirname(decodeURI(import.meta.url.substring(7))) // file:///root/...

const isDir = function isDir (p) {
  try {
    let s = lstatSync(p)
    return s.isDirectory()
  } catch (err) {
    return false
  }
}

export default async (destinationPath) => {
  const sourcePath = path.join(__dirname, 'test-files')

  await copyRecursive(sourcePath, destinationPath)

  // Finally, retrieve the roots so that they can be added to the config
  const roots = await fs.readdir(destinationPath)

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
  verbose(`Copying ${currentPath} -> ${targetPath}...`)
  if (!isDir(currentPath)) {
    await fs.copyFile(currentPath, targetPath)
  } else {
    try {
      await fs.mkdir(targetPath) // Create the directory immediately
    } catch (e) {
      verbose('Could not create directory, as it already exists.')
    }

    const children = await fs.readdir(currentPath)
    for (const child of children) {
      await copyRecursive(
        path.join(currentPath, child),
        path.join(targetPath, child)
      )
    } // END for
  } // END else
}
