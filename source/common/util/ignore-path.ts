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

const DOTFILE_RE = /(?:^|[\/\\])\./

// A list of path names that should be ignored
// by the chokidar watchdog process. Will be converted
// to a RegExp object
const WATCHDOG_IGNORE_PATHS: string[] = [
  '\\.DS_Store', // macOS directory files
  'desktop.ini', // Windows directory files
  '\\.directory', // KDE directory files
  '\\.app',
  '\\.textbundle', // Textbundle
  '\\.git', // Git
  '\\.hg', // Mercurial
  '\\.svn', // SVN
  '\\.obsidian', // Obsidian config
  '\\.quarto', // Quarto config
  '\\.dropbox.*', // Dropbox config
  '\\.~lock.*', // LibreOffice lockfiles
  '~\\$.*\\.(?:doc|dot|xls|ppt)x?', // MS Office temporary files
  '.*\\.~.*', // Nextcloud temporary files
]

// A list of path names that should be ignored
// by the FSAL layer. These are paths that should
// not appear in the UI, however, they should still
// be watched for changes. Will be converted
// to a RegExp object
const IGNORE_PATHS: string[] = [
  '\\.ztr-directory', // Zettlr project settings
  ...WATCHDOG_IGNORE_PATHS
]

// Matches either the start of the line or
// the first letter after a path separator.
const prefixRE = '(?:^|[\\\/\\\\])'

// Matches either the end of the line
// or an internal segment of the path.
const re_suffix = '(?:$|[\\\/\\\\])'

export const WATCHDOG_IGNORE_RE: RegExp[] = WATCHDOG_IGNORE_PATHS
  .map(re => new RegExp(`${re_prefix}${re}${re_suffix}`, 'i'))

export const IGNORE_PATH_RE: RegExp[] = IGNORE_PATHS
  .map(re => new RegExp(`${re_prefix}${re}${re_suffix}`, 'i'))

/**
 * Check if the given filename is a dot file or folder.
 *
 * @param   {string}   filePath  The path to check
 *
 * @return  {boolean}            Whether the file is a dot file or folder
 */
export function isDotFile (filePath: string): boolean {
  return DOTFILE_RE.test(filePath)
}

/**
* Check whether the provided filePath matches an ignored pattern
*
* @param    {string}    filePath   The path to check
*
* @return   {boolean}              Whether the path should be ignored
*/
export function ignorePath (filePath: string, ignoreDotFiles: boolean = true): boolean {
  if (ignoreDotFiles && isDotFile(filePath)) {
    return true
  }

  if (IGNORE_PATH_RE.some(re => re.test(filePath))) {
    return true
  }

  return false
}
