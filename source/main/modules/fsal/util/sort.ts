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

import { CodeFileDescriptor, DirDescriptor, MDFileDescriptor } from '../types'

/**
* This function can sort an array of ZettlrFile and ZettlrDir objects
* @param  {Array<DirDescriptor | MDFileDescriptor>} arr An array containing file and directory descriptors
* @param {string} [type='name-up'] The type of sorting - can be time-up, time-down, name-up or name-down
* @return {Array<DirDescriptor | MDFileDescriptor>}     The sorted array
*/
export default function (
  arr: Array<DirDescriptor | MDFileDescriptor | CodeFileDescriptor>,
  type = 'name-up'
): Array<DirDescriptor | MDFileDescriptor | CodeFileDescriptor> {
  // First split the array based on type
  let f: Array<MDFileDescriptor | CodeFileDescriptor> = []
  let d: DirDescriptor[] = []

  // Should we use natural sorting or ascii?
  let useNatural = global.config.get('sorting') === 'natural'

  // Write in the sortingFunc whatever we should be using
  let sortingFunc = (useNatural) ? naturalSorting : asciiSorting

  // Split up the children list
  for (let c of arr) {
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

  const ret: Array<MDFileDescriptor | DirDescriptor | CodeFileDescriptor> = []

  // Return sorted array files -> directories
  if (global.config.get('sortFoldersFirst')) {
    return ret.concat(d).concat(f)
  } else {
    return ret.concat(f).concat(d)
  }
}
