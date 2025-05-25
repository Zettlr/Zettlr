/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Extracts valid files to be opened with Zettlr
 *                  from the given argv string.
 *
 * END HEADER
 */

// Helpers to determine what files from argv we can open
import { hasMdOrCodeExt } from '@common/util/file-extention-checks'

/**
 * Extracts files from argv.
 *
 * @param   {string[]}  [argv=process.argv]  The array to search for files
 *
 * @returns {string[]}                       The filtered out files
 */
export default function extractFilesFromArgv (argv = process.argv): string[] {
  if (!Array.isArray(argv)) {
    return []
  }

  return argv.filter((arg) => {
    // Filter out CLI arguments, non-files, and non-supported files
    return !arg.startsWith('--') && hasMdOrCodeExt(arg)
  })
}
