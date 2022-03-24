/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to sort files by date.
 *
 * END HEADER
 */

import { RequiredSortingProps } from './sort'

/**
 * Helper function to sort files by modification or creation time
 * @param  {AnyDescriptor} a The first descriptor
 * @param  {AnyDescriptor} b The second descriptor
 * @return {number}          0, 1, or -1, depending upon what the comparision yields.
 */
export default function getDateSorter (whichTime: 'modtime'|'creationtime'): (a: any, b: any) => number {
  return function sortDate<T extends RequiredSortingProps> (a: T, b: T): number {
    let aDate = a.modtime
    let bDate = b.modtime

    if (whichTime !== 'modtime') {
      aDate = a.creationtime
      bDate = b.creationtime
    }

    if (aDate > bDate) {
      return -1
    } else if (aDate < bDate) {
      return 1
    } else {
      return 0
    }
  }
}
