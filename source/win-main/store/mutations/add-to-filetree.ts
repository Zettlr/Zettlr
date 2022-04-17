/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AddToFiletreeMutation
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Adds a new descriptor to the filetree
 *
 * END HEADER
 */

import { DirMeta } from '@dts/common/fsal'
import locateByPath from '@providers/fsal/util/locate-by-path'
import getSorter from '@providers/fsal/util/sort'
import { ZettlrState } from '../'
import reconstructTree from '../reconstruct-tree'

export default function (state: ZettlrState, descriptor: any): void {
  const sorter = getSorter(
    state.config.sorting,
    state.config.sortFoldersFirst,
    state.config.fileNameDisplay,
    state.config.appLang,
    state.config.sortingTime
  )

  if (descriptor.parent == null && !state.fileTree.includes(descriptor)) {
    // It's a root, so insert at the root level
    if (descriptor.type === 'directory') {
      reconstructTree(descriptor)
    }
    state.fileTree.push(descriptor)
    state.fileTree = sorter(state.fileTree) // Omit sorting to sort name-up
  } else if (descriptor.parent != null) {
    const parentPath = descriptor.dir
    const parentDescriptor = locateByPath(state.fileTree, parentPath) as DirMeta|undefined
    if (parentDescriptor === undefined) {
      console.warn(`Was about to add descriptor ${String(descriptor.path)} to the filetree, but the parent ${String(parentPath)} was null!`)
      return
    }

    if (parentDescriptor.children.find((elem: any) => elem.path === descriptor.path) !== undefined) {
      return // We already have this descriptor, nothing to do.
    }

    descriptor.parent = parentDescriptor // Attach the child to its parent
    if (descriptor.type === 'directory') {
      // Make sure the parent pointers work correctly even inside this subtree
      reconstructTree(descriptor)
    }

    parentDescriptor.children.push(descriptor)
    parentDescriptor.children = sorter(parentDescriptor.children, parentDescriptor.sorting)
  } else {
    // NOTE: This is just in case we accidentally introduce a race condition.
    console.warn('[Store] Received event to add a descriptor to the filetree, but it was a root and already present:', descriptor)
  }
}
