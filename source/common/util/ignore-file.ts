/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check for ignored files.
 *
 * END HEADER
 */

import path from 'path'
import { mdFileExtensions, codeFileExtensions } from '../get-file-extensions'

const MD_FILES = mdFileExtensions(true)
const CODE_FILES = codeFileExtensions(true)

/**
 * Returns true, if a given file should be ignored.
 *
 * @param  {string}   p  The path to the file.
 *
 * @return {boolean}     True or false, depending on whether the file should be ignored.
 */
export default function ignoreFile (p: string): boolean {
  let ext = path.extname(p).toLowerCase()
  return (!MD_FILES.includes(ext) && !CODE_FILES.includes(ext))
}
