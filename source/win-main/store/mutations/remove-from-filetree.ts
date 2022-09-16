/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RemoveFromFiletreeMutation
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Removes an existing descriptor from the filetree
 *
 * END HEADER
 */

import { DirDescriptor } from '@dts/common/fsal'
import locateByPath from '@providers/fsal/util/locate-by-path'
import { ZettlrState } from '..'

export default function (state: ZettlrState, pathToRemove: string): void {
  const descriptor = locateByPath(state.fileTree, pathToRemove)

  if (descriptor === undefined) {
    return // No descriptor found -- nothing to do.
  }

  if (descriptor.root) {
    const idx = state.fileTree.findIndex(elem => elem === descriptor)
    state.fileTree.splice(idx, 1)
  } else {
    const parentDescriptor = locateByPath(state.fileTree, descriptor.dir) as DirDescriptor|undefined
    if (parentDescriptor !== undefined) {
      const idx = parentDescriptor.children.findIndex((elem: any) => elem === descriptor)
      parentDescriptor.children.splice(idx, 1)
    }
  }
}
