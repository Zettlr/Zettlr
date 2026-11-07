/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Determines which directories must be uncollapsed in the
 *                  file manager so that a given file becomes visible.
 *
 * END HEADER
 */

import { pathDirname } from './renderer-path-polyfill'

/**
 * Returns all directories from the workspace root containing the file down to
 * the file's own directory, i.e., all directories that need to be uncollapsed
 * in order for the file to be visible in the file tree. If the file is in
 * several (nested) workspaces, the innermost workspace root is used. Returns an
 * empty array if the file is not contained in any of the workspaces.
 *
 * NOTE: This function is renderer-safe, as it does not rely on Node's path.
 *
 * @param   {string}    filePath    The absolute path to the file
 * @param   {string[]}  workspaces  The roots of all open workspaces
 *
 * @return  {string[]}              The directories, ordered from root to file
 */
export default function getDirectoriesToReveal (filePath: string, workspaces: string[]): string[] {
  const dirs: string[] = []
  let current = pathDirname(filePath)

  while (true) {
    dirs.unshift(current)
    if (workspaces.includes(current)) {
      return dirs
    }

    const parent = pathDirname(current)
    if (parent === current || parent === '') {
      return [] // Reached the file system root without hitting a workspace
    }
    current = parent
  }
}
