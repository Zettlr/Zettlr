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

import asciiSorting from './sort-ascii'
import naturalSorting from './sort-natural'
import dateSorting from './sort-date'

export interface RequiredSortingProps {
  type: string
  name: string
  frontmatter?: any
  firstHeading?: string|null
  modtime: number
  creationtime: number
}

/**
* This function can sort an array of ZettlrFile and ZettlrDir objects
* @param  {T[]} arr An array containing file and directory descriptors
* @param {string} [type='name-up'] The type of sorting - can be time-up, time-down, name-up or name-down
* @return {T[]}     The sorted array
*/
export default function sort<T extends RequiredSortingProps> (arr: T[], type: string = 'name-up'): T[] {
  // First split the array based on type
  const f: T[] = []
  const d: T[] = []

  // Should we use natural sorting or ascii?
  const useNatural = global.config.get('sorting') === 'natural'

  // Write in the sortingFunc whatever we should be using
  const sortingFunc = (useNatural) ? naturalSorting : asciiSorting

  // Split up the children list
  for (const c of arr) {
    switch (c.type) {
      case 'file':
      case 'code':
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
      f.sort(dateSorting)
      break
    case 'time-down':
      f.sort(dateSorting).reverse()
      break
  }

  // Return sorted array files -> directories
  if (global.config.get('sortFoldersFirst') === true) {
    return d.concat(f)
  } else {
    return f.concat(d)
  }
}
