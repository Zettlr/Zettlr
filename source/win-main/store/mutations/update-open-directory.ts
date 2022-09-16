/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateOpenDirectoryMutation
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Updates the open directory in the store
 *
 * END HEADER
 */

import { DirDescriptor } from '@dts/common/fsal'
import locateByPath from '@providers/fsal/util/locate-by-path'
import { ZettlrState } from '..'

export default function (state: ZettlrState, descriptor: DirDescriptor|null): void {
  if (descriptor === null) {
    state.selectedDirectory = null
  } else {
    const ownDescriptor = locateByPath(state.fileTree, descriptor.path)

    if (ownDescriptor !== undefined && ownDescriptor.type === 'directory') {
      state.selectedDirectory = ownDescriptor
    }
  }
}
