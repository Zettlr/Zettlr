/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        alphabeticSort
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A utility function that sorts a given array of directories.
 *                  The function should be passed the array and a string determining
 *                  how to sort the array.
 *
 * END HEADER
 */

import { DirMeta } from '@dts/common/fsal'

/**
 * Returns a sorted array of directories
 *
 * @param   {DirMeta}   dirArray         The directories to be sorted
 * @param   {string}    sortBy           How to sort the directories
 *
 * @return  {DirMeta[]}                  The sorted array
 */
export default function alphabeticSort (dirArray: DirMeta[], sortBy: string): DirMeta[] {
  function compare (a: DirMeta, b: DirMeta): number {

    // get names of directory in lowercase due to ASCII values
    let nameA = a.name.toLowerCase()
    let nameB = b.name.toLowerCase()

    // if directories have the same name, compare their parent's name
    if (nameA === nameB) {
      let dirA = a.dir.toLowerCase()
      let dirB = b.dir.toLowerCase()
      if (dirA < dirB) { return -1 }
      if (dirA > dirB) { return 1 }

    // else compare regularly
    } else {
      if (nameA < nameB) { return -1 }
      if (nameA > nameB) { return 1 }
    }
    return 0
  }

  // return array in reverse alphabetical order
  if (sortBy === 'AlphaD') {
    return dirArray.sort(compare).reverse()
  }

  // return array in alphabetical order
  return dirArray.sort(compare)
}
