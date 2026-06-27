/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      benniekiss
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to normalize file paths
 *
 * END HEADER
 */

import path from 'path'

/**
 * Normalize a file path, removing internal `..` and `.` segments.
 *
 * If `root` is provied, and the normalized path is relative, the returned path
 * will be resolved against `root`. It is guaranteed that the returned path will
 * be a child under `root`.
 *
 * @param   {string}  fp    The path to be tested
 * @param   {string?} root  If `fp` is relative, it will be resolved against `root`.
 *
 * @return  {string}        The normalized path
 */
export default function normalizePath (fp: string, root?: string): string {
  let target = path.normalize(fp)

  // If the target is a relative path, resolve it to the root path
  // and sanitize any potential path traversals.
  if (!path.isAbsolute(target) && root !== undefined) {
    target = path.resolve(root, target)

    // Make sure that the resolved path still falls under `root`
    // to prevent potentially insecure path traversals.
    if (!target.startsWith(root)) {
      const parsed = path.parse(target)
      target = path.join(root, parsed.base)
    }
  }

  return target
}
