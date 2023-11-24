/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        sortDirectory
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This utility function recursively sorts an entire directory
 *                  tree.
 *
 * END HEADER
 */

import { type DirDescriptor } from '@dts/common/fsal'
import { type GenericSorter } from '@providers/fsal/util/directory-sorter'

/**
 * This function takes a single directory in and sorts it *as well as all of its
 * children recursively*. The sorting happens *in place*.
 *
 * @param   {DirDescriptor}  dirDescriptor  The directory to sort.
 * @param   {GenericSorter}  sorter         The sorter.
 */
export function sortDirectory (dirDescriptor: DirDescriptor, sorter: GenericSorter): void {
  dirDescriptor.children = sorter(dirDescriptor.children, dirDescriptor.settings.sorting)
  for (const child of dirDescriptor.children) {
    if (child.type === 'directory') {
      sortDirectory(child, sorter)
    }
  }
}
