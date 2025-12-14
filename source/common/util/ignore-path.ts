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

// chokidar's ignored-setting is compatible to anymatch, so we can
// pass an array containing the standard dotted directory-indicators,
// directories that should be ignored and a function that returns true
// for all files that are _not_ in the filetypes list (whitelisting)
// Further reading: https://github.com/micromatch/anymatch
const IGNORE_PATH_RE: RegExp[] = [
  // Ignore dot-dirs/files, except .git (to detect changes to possible
  // git-repos) and .ztr-files (which contain, e.g., directory settings)
  /(?:^|[\/\\])\.DS_Store$/i, // macOS directory files
  /(?:^|[\/\\])desktop.ini$/i, // Windows directory files
  /(?:^|[\/\\])\.directory$/i, // KDE directory files
  /(?:^|[\/\\])\.app$/i,
  /(?:^|[\/\\])\.textbundle$/i, // Textbundle
  /(?:^|[\/\\])\.ztr-directory$/i, // Zettlr project settings
  /(?:^|[\/\\])\.git$/i, // Git
  /(?:^|[\/\\])\.hg$/i, // Mercurial
  /(?:^|[\/\\])\.svn$/i, // SVN
  /(?:^|[\/\\])\.obsidian$/i, // Obsidian config
  /(?:^|[\/\\])\.quarto$/i, // Quarto config
  /(?:^|[\/\\])\.dropbox/i, // Dropbox config
  /(?:^|[\/\\])\.~lock\./i, // LibreOffice lockfiles
  /(?:^|[\/\\])~\$.*\.(?:doc|dot|xls|ppt)x?$/i, // MS Office temporary files
]

/**
 * Check if the given filename is a dot file.
 *
 * @param   {string}   filePath  The filename to check
 *
 * @return  {boolean}            Whether the file is a dot file
 */
export function isDotFile (filePath: string): boolean {
  return /(?:^|[\/\\])\./.test(filePath)
}

/**
* Returns true, if a directory should be ignored, and false, if not.
*
* @param    {string}    filePath   The path to the directory. It will be checked against some regexps.
*
* @return   {boolean}              True or false, depending on whether or not the dir should be ignored.
*/
export function ignorePath (filePath: string): boolean {
  return IGNORE_PATH_RE.some(re => re.test(filePath))
}
