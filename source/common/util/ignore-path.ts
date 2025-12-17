/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Utility functions to check for ignored file paths.
 *
 *
 * END HEADER
 */

// A list of path patterns that should be ignored
// by the chokidar watchdog process
export const WATCHDOG_IGNORE_RE: RegExp[] = [
  /(?:^|[\/\\])\.DS_Store$/i, // macOS directory files
  /(?:^|[\/\\])desktop.ini$/i, // Windows directory files
  /(?:^|[\/\\])\.directory$/i, // KDE directory files
  /(?:^|[\/\\])\.app$/i,
  /(?:^|[\/\\])\.textbundle$/i, // Textbundle
  /(?:^|[\/\\])\.git$/i, // Git
  /(?:^|[\/\\])\.hg$/i, // Mercurial
  /(?:^|[\/\\])\.svn$/i, // SVN
  /(?:^|[\/\\])\.obsidian$/i, // Obsidian config
  /(?:^|[\/\\])\.quarto$/i, // Quarto config
  /(?:^|[\/\\])\.dropbox/i, // Dropbox config
  /(?:^|[\/\\])\.~lock\./i, // LibreOffice lockfiles
  /(?:^|[\/\\])~\$.*\.(?:doc|dot|xls|ppt)x?$/i, // MS Office temporary files
]

// A list of path patterns that should be ignored
// by the FSAL layer. These are paths that should
// not appear in the UI, however, they should still
// be watched for changes
export const IGNORE_PATH_RE = [
  /(?:^|[\/\\])\.ztr-directory$/i, // Zettlr project settings
  ...WATCHDOG_IGNORE_RE
]

/**
 * Check if the given filename is a dot file or folder.
 *
 * @param   {string}   filePath  The path to check
 *
 * @return  {boolean}            Whether the file is a dot file or folder
 */
export function isDotFile (filePath: string): boolean {
  return /(?:^|[\/\\])\./.test(filePath)
}

/**
* Check whether the provided filePath matches an ignored pattern
*
* @param    {string}    filePath   The path to check
*
* @return   {boolean}              Whether the path should be ignored
*/
export function ignorePath (filePath: string): boolean {
  return IGNORE_PATH_RE.some(re => re.test(filePath))
}
