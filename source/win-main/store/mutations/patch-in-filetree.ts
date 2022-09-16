/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PatchInFiletreeMutation
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Patches an existing descriptor in the filetree
 *
 * END HEADER
 */

import { AnyDescriptor, DirDescriptor } from '@dts/common/fsal'
import locateByPath from '@providers/fsal/util/locate-by-path'
import getSorter from '@providers/fsal/util/sort'
import { ZettlrState } from '..'

export default function (state: ZettlrState, descriptor: AnyDescriptor): void {
  const ownDescriptor = locateByPath(state.fileTree, descriptor.path)
  const sorter = getSorter(
    state.config.sorting,
    state.config.sortFoldersFirst,
    state.config.fileNameDisplay,
    state.config.appLang,
    state.config.sortingTime
  )

  if (ownDescriptor === undefined) {
    console.error(`[Vuex::patchInFiletree] Could not find descriptor for ${descriptor.path}! Not patching.`)
    return
  }

  const protectedKeys = [ 'children', 'attachments' ]

  for (const key of Object.keys(descriptor) as Array<keyof AnyDescriptor>) {
    if (protectedKeys.includes(key)) {
      continue // Don't overwrite protected keys which would result in dangling descriptors
    }

    // @ts-expect-error Typescript doesn't like in place mutation :(
    ownDescriptor[key] = descriptor[key]
  }

  // Now we have to check if we had a directory. If so, we can know for sure
  // that the name did not change (because that would've resulted in a
  // removal and one addition) but rather something else, so we need to make
  // sure to simply re-sort it in case the sorting has changed.
  // If we have a file, update the parent instead.
  if (ownDescriptor.type === 'directory') {
    ownDescriptor.children = sorter(ownDescriptor.children, ownDescriptor.settings.sorting)
  } else if (ownDescriptor.type === 'file' && !ownDescriptor.root) {
    const parentDescriptor = locateByPath(state.fileTree, ownDescriptor.dir) as DirDescriptor|undefined
    if (parentDescriptor === undefined) {
      return
    }
    parentDescriptor.children = sorter(parentDescriptor.children, parentDescriptor.settings.sorting)
  }
}
