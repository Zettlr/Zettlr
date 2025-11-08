import type { GenericSorter } from 'source/common/util/directory-sorter'
import type { AnyDescriptor } from 'source/types/common/fsal'

/**
 * Utility function that recursively sorts the various contained directories
 * within the base descriptor according to the correct settings and then returns
 * them as a flat list sorted accordingly.
 *
 * @param   {AnyDescriptor}      descriptor      The base descriptor
 * @param   {AnyDescriptor[][]}  allDescriptors  The registry of descriptors
 *
 * @return  {AnyDescriptor[]}                    The sorted list of descriptors.
 */
export function retrieveChildrenAndSort (descriptor: AnyDescriptor, allDescriptors: AnyDescriptor[], sorter: GenericSorter): AnyDescriptor[] {
  if (descriptor.type !== 'directory') {
    return [descriptor]
  }

  const directDescendants = allDescriptors.filter(d => d.dir === descriptor.path)
  const sortedDescendants = sorter(directDescendants, descriptor.settings.sorting)
  return [
    descriptor,
    ...sortedDescendants.flatMap(d => retrieveChildrenAndSort(d, allDescriptors, sorter))
  ]
}
