import locateByPath from '@providers/fsal/util/locate-by-path'
import type { AnyDescriptor, DirDescriptor } from '@dts/common/fsal'
import type { ChangeDescriptor } from './root'
import { type GenericSorter } from '@providers/fsal/util/directory-sorter'

const PATH_SEP = process.platform === 'win32' ? '\\' : '/'

/**
 * This function takes a series of change events for the file trees and merges
 * those one after another into the provided tree, returning the new tree. NOTE:
 * This requires that the events are actually accumulated for this tree;
 * providing another tree will lead to errors and inconsistencies. NOTE: This
 * function will also be imported by the renderer so DO NOT USE ANY MAIN PROCESS
 * DEPENDENCIES!
 *
 * @param   {ChangeDescriptor[]}  events  The list of changes
 * @param   {AnyDescriptor}       tree    The tree to merge the changes into
 *
 * @return  {AnyDescriptor}               The modified tree
 */
export function mergeEventsIntoTree (events: ChangeDescriptor[], tree: AnyDescriptor, sortFunction: GenericSorter): AnyDescriptor {
  let descriptorToReturn = tree

  for (const event of events) {
    if (event.type === 'add') {
      if (locateByPath(descriptorToReturn, event.descriptor.path) !== undefined) {
        console.error(`Received an add event for a path that is already present in the tree -- not merging in (${event.descriptor.path}).`)
        continue
      }

      // Find the parent, and add the given descriptor to its children
      const parent = locateByPath(descriptorToReturn, event.descriptor.dir)
      if (parent === undefined || parent.type !== 'directory') {
        throw new Error(`[mergeEventsIntoTree] add:${event.descriptor.path}: Local tree did not contain the descriptor's parent.`)
      }

      parent.children.push(event.descriptor)
      parent.children = sortFunction(parent.children, parent.settings.sorting)
    } else if (event.type === 'change' && event.path === descriptorToReturn.path) {
      // The descriptor itself has changed (NOTE: We are checking both descriptors for type reasons)
      if (event.descriptor.type === 'directory' && descriptorToReturn.type === 'directory') {
        const existingChildren = descriptorToReturn.children
        descriptorToReturn = event.descriptor
        descriptorToReturn.children = existingChildren
        // A "change" is also when the sorting has changed.
        descriptorToReturn.children = sortFunction(descriptorToReturn.children, descriptorToReturn.settings.sorting)
      } else {
        descriptorToReturn = event.descriptor
      }
    } else if (event.type === 'change') {
      const parent = locateByPath(descriptorToReturn, event.descriptor.dir)

      if (parent === undefined || parent.type !== 'directory') {
        throw new Error(`[mergeEventsIntoTree] change:${event.path}: Local tree did not contain the descriptor's parent.`)
      }

      const idx = parent.children.findIndex(desc => desc.path === event.path)

      if (idx < 0) {
        throw new Error(`[mergeEventsIntoTree] change:${event.path}: Could not find the old descriptor in the parent.`)
      }

      if (event.descriptor.type === 'directory') {
        // Ensure to carry over the recursive children array
        event.descriptor.children = (parent.children[idx] as DirDescriptor).children
      }

      parent.children.splice(idx, 1, event.descriptor)
    } else {
      // Unlink event
      // NOTE: We cannot use path here since this function is also required in
      // renderer processes
      const dirname = event.path.substring(0, event.path.lastIndexOf(PATH_SEP))
      const parent = locateByPath(descriptorToReturn, dirname)
      if (parent === undefined || parent.type !== 'directory') {
        throw new Error(`[mergeEventsIntoTree] unlink:${event.path}: Could not find the descriptor's parent.`)
      }

      const idx = parent.children.findIndex(desc => desc.path === event.path)

      if (idx < 0) {
        throw new Error(`[mergeEventsIntoTree] unlink:${event.path}: Could not remove descriptor from tree.`)
      }

      parent.children.splice(idx, 1)
    }
  }

  return descriptorToReturn
}
