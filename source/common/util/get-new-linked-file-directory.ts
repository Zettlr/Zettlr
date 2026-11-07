/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Determines the directory in which a file should be created
 *                  when the user follows an internal link to a file that does
 *                  not yet exist.
 *
 * END HEADER
 */

import path from 'path'

export type NewLinkedFileLocation = 'default'|'workspaceRoot'|'currentFolder'|'customFolder'

/**
 * Returns the root of the workspace that contains the given file. If several
 * open workspaces contain the file (i.e., nested workspaces), the innermost
 * one is returned. Returns undefined if the file is not in any workspace.
 *
 * @param   {string}            filePath    The absolute file path
 * @param   {string[]}          workspaces  The roots of all open workspaces
 *
 * @return  {string|undefined}              The workspace root, if any
 */
export function getWorkspaceRootForFile (filePath: string, workspaces: string[]): string|undefined {
  let bestMatch: string|undefined
  for (const root of workspaces) {
    const rel = path.relative(root, filePath)
    // The file is inside the root only if the relative path does not leave it.
    // NOTE: A simple startsWith check would erroneously treat "/notes2/a.md"
    // as being inside "/notes".
    const isInside = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
    if (isInside && (bestMatch === undefined || root.length > bestMatch.length)) {
      bestMatch = root
    }
  }
  return bestMatch
}

/**
 * Returns the directory in which a not-yet-existing linked file should be
 * created, or undefined if no file should be created at all.
 *
 * - `default`: Do not create a file.
 * - `workspaceRoot`: Use the root of the open workspace containing the file
 *   with the link. Does not create a file if it is not in any workspace.
 * - `currentFolder`: Use the directory of the file containing the link.
 * - `customFolder`: Use the custom directory.
 *
 * NOTE: This function does not check whether the directory actually exists.
 *
 * @param   {NewLinkedFileLocation}  location         The configured location
 * @param   {string}                 customDirectory  The custom directory
 * @param   {string|null}            sourceFilePath   The file containing the link
 * @param   {string[]}               workspaces       The roots of all open workspaces
 *
 * @return  {string|undefined}                        The target directory
 */
export default function getNewLinkedFileDirectory (
  location: NewLinkedFileLocation,
  customDirectory: string,
  sourceFilePath: string|null|undefined,
  workspaces: string[] = []
): string|undefined {
  const customDir = customDirectory.trim() !== '' ? customDirectory : undefined
  const hasSource = sourceFilePath != null && sourceFilePath.trim() !== ''

  switch (location) {
    case 'workspaceRoot':
      return hasSource ? getWorkspaceRootForFile(sourceFilePath, workspaces) : undefined
    case 'currentFolder':
      return hasSource ? path.dirname(sourceFilePath) : undefined
    case 'customFolder':
      return customDir
    case 'default':
    default:
      return undefined
  }
}
