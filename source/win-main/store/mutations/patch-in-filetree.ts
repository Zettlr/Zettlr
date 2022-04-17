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

import { AnyMetaDescriptor, DirMeta } from '@dts/common/fsal'
import locateByPath from '@providers/fsal/util/locate-by-path'
import getSorter from '@providers/fsal/util/sort'
import { ZettlrState } from '..'

export default function (state: ZettlrState, descriptor: AnyMetaDescriptor): void {
  const ownDescriptor = locateByPath(state.fileTree, descriptor.path) as AnyMetaDescriptor|undefined
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

  const protectedKeys = [ 'parent', 'children', 'attachments' ]

  for (const key of Object.keys(descriptor) as Array<keyof AnyMetaDescriptor>) {
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
    ownDescriptor.children = sorter(ownDescriptor.children, ownDescriptor.sorting)
  } else if (ownDescriptor.type === 'file' && ownDescriptor.parent != null) {
    const parentDescriptor = ownDescriptor.parent as unknown as DirMeta
    parentDescriptor.children = sorter(parentDescriptor.children, parentDescriptor.sorting)
  }
}
