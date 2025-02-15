/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        pathToUnix
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Converts a path to UNIX conventions.
 *
 * END HEADER
 */

/**
 * Helper function that converts any path fragment -- especially when it comes
 * from Windows -- into a Unix path by replacing \ with /.
 *
 * @param   {string}  pathFragment  The path (fragment)
 *
 * @return  {string}                The path as a Unix path
 */
export function pathToUnix (pathFragment: string): string {
  return pathFragment.replace(/\\/g, '/')
}
