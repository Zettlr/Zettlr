/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check for ignored dirs.
 *
 * END HEADER
 */

import path from 'path'

// Ignored directory patterns
import { ignoreDirs } from '../data.json'

// chokidar's ignored-setting is compatible to anymatch, so we can
// pass an array containing the standard dotted directory-indicators,
// directories that should be ignored and a function that returns true
// for all files that are _not_ in the filetypes list (whitelisting)
// Further reading: https://github.com/micromatch/anymatch
const IGNORE_DIR_REGEXP: RegExp[] = [
  // Ignore dot-dirs/files, except .git (to detect changes to possible
  // git-repos) and .ztr-files (which contain, e.g., directory settings)
  // /(?:^|[\/\\])\.(?!git[\/\\]?|ztr-directory).+/,
]

// Create new regexps from the strings
for (let x of ignoreDirs) {
  IGNORE_DIR_REGEXP.push(new RegExp(x, 'i'))
}

/**
* Returns true, if a directory should be ignored, and false, if not.
* @param  {String} p The path to the directory. It will be checked against some regexps.
* @return {Boolean}   True or false, depending on whether or not the dir should be ignored.
*/
export default function ignoreDir (p: string): boolean {
  let name = path.basename(p)

  return IGNORE_DIR_REGEXP.some(re => re.test(name))
}
