import { AnyMetaDescriptor } from '@dts/common/fsal'
import { AnyDescriptor } from '@dts/main/fsal'

type MetaOrNotToMeta = AnyDescriptor | AnyMetaDescriptor

const PATH_SEP = process.platform === 'win32' ? '\\' : '/'

/**
 * Takes a tree of descriptors and returns the descriptor that exactly matches
 * targetPath, or undefined.
 *
 * @param   {AnyMetaDescriptor|AnyDescriptor}  tree        One or more descriptors
 * @param   {string}                           targetPath  The (absolute) path to search for
 *
 * @return  {AnyMetaDescriptor|AnyDescriptor|undefined}    Either the descriptor or undefined
 */
export function locateByPath (tree: AnyMetaDescriptor|AnyMetaDescriptor[], targetPath: string): AnyMetaDescriptor|undefined
export function locateByPath (tree: AnyDescriptor|AnyDescriptor[], targetPath: string): AnyDescriptor|undefined
export default function locateByPath (tree: MetaOrNotToMeta|MetaOrNotToMeta[], targetPath: string): MetaOrNotToMeta|undefined {
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
