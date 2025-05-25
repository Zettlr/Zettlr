/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Rendererer path polyfill functions
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains a subset of Node.js's path functions
 *                  which we need despite the renderer sandbox. NOTE: This is a
 *                  subset that only implements required functions and not deals
 *                  with all edge cases, only the relevant ones!
 *
 * END HEADER
 */

/**
 * Returns the correct path separator for the given path.
 *
 * @param   {string}  path  The path to check
 *
 * @return  {string}        Either \ or /
 */
function sep (path: string): '\\'|'/' {
  return isWin32Path(path) ? '\\' : '/'
}

/**
 * Utility function that checks if a path is likely a win32-path
 *
 * @param   {string}   path  The path to check
 *
 * @return  {boolean}        Returns true if the path includes backslashes but
 *                           no forward slashes.
 */
export function isWin32Path (path: string): boolean {
  // We make use of the fact that on Windows, forward slashes are forbidden in
  // path names, and it is unusual to see backslashes in Unix paths.
  return path.includes('\\') && !path.includes('/')
}

/**
 * Returns true if provided path equals the root on a Windows or Unix machine.
 *
 * @param   {string}   path  The path to check
 *
 * @return  {boolean}        True if it equals the root directory
 */
function isRootDir (path: string): boolean {
  return path === '/' || /^[A-Z]:\\$/i.test(path)
}

/**
 * Returns true if the given path is absolute.
 *
 * @param   {string}   path  The path to check
 *
 * @return  {boolean}        True if it's absolute
 */
export function isAbsolutePath (path: string): boolean {
  if (path.length < 2) {
    return false // Invalid length
  } else if (path.length >= 1 && path.startsWith('/')) {
    return true // Unix
  } else if (path.length >= 3 && (/^[A-Z]:[\\/]/i.test(path) || path.startsWith('\\\\'))) {
    return true // Windows (drive letters + network drives)
  } else {
    return false
  }
}

/**
 * Returns the relative path from from to to.
 *
 * @param   {string}  from  The source location
 * @param   {string}  to    The target location
 *
 * @return  {string}        The relative path
 */
export function relativePath (from: string, to: string): string {
  if (sep(from) !== sep(to)) {
    throw new Error('Cannot calculate relative path between win32 and Unix paths')
  }

  // Edge cases
  if (to.startsWith(from)) {
    // to is already the relative path
    return to.substring(from.length + 1) // Remove path separator
  } else if (isWin32Path(from) && isWin32Path(to) && to[0].toLowerCase() !== from[0].toLowerCase()) {
    // Files are on different drives
    return to
  } /* else if (pathDirname(from) === pathDirname(to)) {
    // Same directory
    return pathBasename(to)
  } */

  // After the edge cases, we have to do some more work. Finding the relative
  // path is a combination of adding '..' and parts of either path to the other.
  const fromSegments = from.split(sep(from))
  const toSegments = to.split(sep(to))
  if (fromSegments.length === 1) {
    // Happens with, e.g., filenames. Node.js's path assumes traversing up from
    // both path starts here
    fromSegments.unshift('..')
    toSegments.unshift('..')
  }
  let lastCommonSegment = 0
  for (let i = 0; i < Math.min(fromSegments.length, toSegments.length); i++) {
    if (fromSegments[i] === toSegments[i]) {
      lastCommonSegment = i
    } else {
      break
    }
  }

  // Now we have to do two things: (1) move up from from to the last common
  // segment and then (2) append the remaining segments from to
  const seq = `..${sep(from)}`.repeat(fromSegments.length - lastCommonSegment - 1)
  const appendix = toSegments.slice(lastCommonSegment + 1).join(sep(to))
  const relativePath = seq + appendix
  return relativePath.endsWith(sep(from)) ? relativePath.substring(0, relativePath.length - 1) : relativePath
}

/**
 * Resolves the provided (relative) path using the (absolute) base to an
 * absolute path to the resource.
 *
 * @param   {string}  base  The base.
 * @param   {string}  path  The path.
 *
 * @return  {string}        The path, turned absolute.
 */
export function resolvePath (base: string, path: string): string {
  if (isAbsolutePath(path)) {
    return path
  }

  const pathSegments = path.split(sep(path))
  if (pathSegments[0] === '.') {
    // Remove a potential this-dir indicator
    pathSegments.splice(0, 1)
  }

  // NOTE: We reverse the array, which makes splicing path segments easier.
  const baseSegments = base.split(sep(base)).reverse()

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]
    // For each "go up", remove one base segment
    if (segment === '..') {
      baseSegments.splice(0, 1) // NOTE: basePath is reversed
      pathSegments.splice(0, 1)
      i--
    } else {
      break
    }
  }

  // This ensures that the resolved path ends with a separator
  if (pathSegments.length === 0) {
    pathSegments.push('')
  }

  return [ ...baseSegments.reverse(), ...pathSegments ].join(sep(base))
}

/**
 * Returns the last part of a path, i.e. either a filename or a directory name.
 *
 * @param   {string}  path     The path to extract from
 * @param   {string}  extname  An optional extension to strip from the basename
 *
 * @return  {string}           The basename
 */
export function pathBasename (path: string, extname?: string): string {
  const basename = path.substring(path.lastIndexOf(sep(path)) + 1)
  if (extname !== undefined && basename.endsWith(extname)) {
    return basename.substring(0, basename.length - extname.length)
  } else {
    return basename
  }
}

/**
 * Returns the path extension (which can also be .app for folder bundles on
 * macOS).
 *
 * @param   {string}  path  The path to extract from
 *
 * @return  {string}        The extension name; empty string if no extension
 */
export function pathExtname (path: string): string {
  return path.includes('.') ? path.substring(path.lastIndexOf('.')) : ''
}

/**
 * Returns the directory name of a path (i.e., the parent directory). Returns
 * identity if path is the root directory, and an empty string if it describes
 * only a folder/file. NOTE: This function returns '..' or '.' if applicable.
 *
 * @param   {string}  path  The path to extract from
 *
 * @return  {string}        The directory name
 */
export function pathDirname (path: string): string {
  if (isRootDir(path)) {
    return path
  }
  const s = sep(path)
  return path.includes(s) ? path.substring(0, path.lastIndexOf(s)) : '.'
}
