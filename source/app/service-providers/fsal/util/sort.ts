/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to sort directories.
 *
 * END HEADER
 */

import getAsciiSorter from './sort-ascii'
import getNaturalSorter from './sort-natural'
import getDateSorter from './sort-date'
// import { MaybeRootDescriptor } from '@dts/main/fsal'

export interface RequiredSortingProps {
  type: string
  name: string
  frontmatter?: any
  firstHeading?: string|null
  modtime: number
  creationtime: number
}

type GenericSorter = <T extends RequiredSortingProps>(arr: T[], type?: string) => T[]

/**
* This function can sort an array of ZettlrFile and ZettlrDir objects
* @param  {T[]} arr An array containing file and directory descriptors
* @param {string} [type='name-up'] The type of sorting - can be time-up, time-down, name-up or name-down
* @return {T[]}     The sorted array
*/
export default function getSorter (
  sortingType: 'natural'|'ascii',
  sortFoldersFirst: boolean,
  fileNameDisplay: 'filename'|'title'|'heading'|'title+heading',
  appLang: string,
  whichTime: 'modtime'|'creationtime'
): GenericSorter {
  return function sort <T extends RequiredSortingProps> (arr: T[], type: string = 'name-up'): T[] {
    // First split the array based on type
    const f: T[] = []
    const d: T[] = []

    // Should we use natural sorting or ascii?
    const useNatural = sortingType === 'natural'

    // Write in the sortingFunc whatever we should be using
    const sortingFunc = (useNatural) ? getNaturalSorter(fileNameDisplay, appLang) : getAsciiSorter(fileNameDisplay)

    // Split up the children list
    for (const c of arr) {
      switch (c.type) {
        case 'file':
        case 'code':
        case 'other':
          f.push(c)
          break
        case 'directory':
          d.push(c)
          break
      }
    }

    // Sort the directories (always based on name)
    d.sort(sortingFunc)

    // Now sort the files according to the type of sorting
    switch (type) {
      case 'name-up':
        f.sort(sortingFunc)
        break
      case 'name-down':
        f.sort(sortingFunc).reverse()
        break
      case 'time-up':
        f.sort(getDateSorter(whichTime))
        break
      case 'time-down':
        f.sort(getDateSorter(whichTime)).reverse()
        break
    }

    // Return sorted array files -> directories
    if (sortFoldersFirst) {
      return d.concat(f)
    } else {
      return f.concat(d)
    }
  }
}
