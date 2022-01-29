import { AnyDescriptor } from '@dts/main/fsal'

// This function performs a simple lookup. We know the tree is a file tree, which
// means that the descriptor we're dealing with MUST be a starting portion of
// searchPath. So we only have three options:
// 1. tree.path === searchPath --> Return, because we found the descriptor
// 2. searchPath.startsWith(tree.path) --> Traverse down the tree
// 3. !searchPath.startsWith(tree.path) --> Return undefined, because the tree cannot contain the searchPath
export default function locateByPath (tree: AnyDescriptor|AnyDescriptor[], searchPath: string): AnyDescriptor|undefined {
  // First let's see if we can shortcut
  if (!Array.isArray(tree) && tree.path === searchPath) {
    // The tree was a single descriptor and had the correct path. Return it.
    return tree
  } else if (Array.isArray(tree)) {
    // The tree itself is an array, so we probably got the full fileTree
    for (const item of tree) {
      if (!searchPath.startsWith(item.path)) {
        continue // This item cannot contain the wanted descriptor
      }

      const ret = locateByPath(item, searchPath)
      if (ret !== undefined) {
        return ret
      }
    }
  } else if (tree.type === 'directory') {
    // The descendants are an array
    for (const child of tree.children) {
      if (!searchPath.startsWith(child.path)) {
        continue // This child cannot contain the wanted descriptor
      }

      const ret = locateByPath(child, searchPath)
      if (ret !== undefined) {
        return ret
      }
    }

    // Now check the attachments
    for (const otherFile of tree.attachments) {
      if (otherFile.path === searchPath) {
        return otherFile
      }
    }
  }

  return undefined
}
