/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        locateByPath
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small utility function that takes a directory tree and
 *                  returns the descriptor for the given path, if available.
 *
 * END HEADER
 */
import type { AnyDescriptor } from '@dts/common/fsal'

const PATH_SEP = process.platform === 'win32' ? '\\' : '/'

/**
 * Takes a tree of descriptors and returns the descriptor that exactly matches
 * targetPath, or undefined.
 *
 * @param   {AnyDescriptor}            tree        One or more descriptors
 * @param   {string}                   targetPath  The (absolute) path to search for
 *
 * @return  {AnyDescriptor|undefined}              Either the descriptor or undefined
 */
export default function locateByPath (tree: AnyDescriptor|AnyDescriptor[], targetPath: string): AnyDescriptor|undefined {
  // We need to find a target
  if (Array.isArray(tree)) {
    for (const descriptor of tree) {
      if (targetPath === descriptor.path) {
        // We have the correct element
        return descriptor
      } else if (targetPath.startsWith(descriptor.path + PATH_SEP) && descriptor.type === 'directory') {
        // We have the correct tree
        return locateByPath(descriptor.children, targetPath)
      }
    }
  } else if (tree.type === 'directory') {
    // Single tree element
    if (targetPath === tree.path) {
      // Found the element
      return tree
    }

    for (const child of tree.children) {
      if (targetPath === child.path) {
        // We got the correct child
        return child
      } else if (targetPath.startsWith(child.path + PATH_SEP) && child.type === 'directory') {
        // Traverse further down
        return locateByPath(child.children, targetPath)
      }
    }
  }

  return undefined
}
