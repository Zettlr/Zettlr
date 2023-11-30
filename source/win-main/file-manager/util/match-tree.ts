/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        matchTree
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A recursive matcher function that uses a filter function as
 *                  returned by matchQuery in order to match a full directory
 *                  against it. The function returns a new descriptor if either
 *                  the directory itself or any of its children have matched the
 *                  provided function, or it returns undefined, indicating that
 *                  nothing matched.
 *
 * END HEADER
 */

import type { AnyDescriptor, DirDescriptor } from '@dts/common/fsal'

type FilterFunction = (item: AnyDescriptor) => boolean

/**
 * Matches a given directory descriptor against a prepared filter function (see
 * match-query.ts in this directory). Returns either a DirDescriptor containing
 * only the matches, or undefined, if nothing within the directory matches. This
 * does not modify the original directory.
 *
 * @param   {DirDescriptor}            directory  The directory to match
 * @param   {FilterFunction}           filter     The filter function to match against
 *
 * @return  {DirDescriptor|undefined}             Either a novel descriptor, or undefined
 */
export default function matchTree (directory: DirDescriptor, filter: FilterFunction): DirDescriptor|undefined {
  // From SO: "The properties are added in order, so if you want to override
  // existing properties, you need to put them at the end instead of at the
  // beginning" (source: https://stackoverflow.com/a/49491435)
  // Thus, we can construct "new" objects in which we only override the children
  // property without affecting the full file tree permanently.
  const reslist = []
  for (const child of directory.children) {
    if (child.type === 'directory') {
      const result = matchTree(child, filter)
      if (result !== undefined) {
        reslist.push(result)
      }
    } else if (filter(child)) {
      reslist.push(child)
    }
  }

  if (reslist.length === 0 && filter(directory)) {
    // None of the children matched, but the directory
    return {
      ...directory,
      children: []
    }
  } else if (reslist.length > 0) {
    // At least one child has matched.
    return {
      ...directory,
      children: reslist
    }
  }

  // Else: Return undefined
}
