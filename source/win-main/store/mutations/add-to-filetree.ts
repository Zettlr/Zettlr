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

import type { DirDescriptor, MaybeRootDescriptor } from '@dts/common/fsal'
import locateByPath from '@providers/fsal/util/locate-by-path'
import getSorter from '@providers/fsal/util/sort'
import { type ZettlrState } from '../'

export default function (state: ZettlrState, descriptor: MaybeRootDescriptor): void {
  const sorter = getSorter(
    state.config.sorting,
    state.config.sortFoldersFirst,
    state.config.fileNameDisplay,
    state.config.appLang,
    state.config.sortingTime
  )

  if (descriptor.root && !state.fileTree.includes(descriptor)) {
    // It's a root, so insert at the root level
    state.fileTree.push(descriptor)
    state.fileTree = sorter(state.fileTree) // Omit sorting to sort name-up
  } else if (!descriptor.root) {
    const parentPath = descriptor.dir
    const parentDescriptor = locateByPath(state.fileTree, parentPath) as DirDescriptor|undefined
    if (parentDescriptor === undefined) {
      console.warn(`Was about to add descriptor ${String(descriptor.path)} to the filetree, but the parent ${String(parentPath)} was null!`)
      return
    }

    if (parentDescriptor.children.find((elem: any) => elem.path === descriptor.path) !== undefined) {
      return // We already have this descriptor, nothing to do.
    }

    parentDescriptor.children.push(descriptor)
    parentDescriptor.children = sorter(parentDescriptor.children, parentDescriptor.settings.sorting)
  } else {
    // NOTE: This is just in case we accidentally introduce a race condition.
    console.warn('[Store] Received event to add a descriptor to the filetree, but it was a root and already present:', descriptor)
  }
}
