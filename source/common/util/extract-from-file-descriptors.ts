import type { MDFileDescriptor, AnyDescriptor } from 'source/types/common/fsal'

/**
 * Small utility function that extracts the given property from the provided
 * file descriptors. `prop` must be a key on MDFileDescriptor.
 *
 * @param   {AnyDescriptor[]}      descriptors  An unsorted list of any type of descriptor.
 * @param   {Key}                  prop         The property to extract
 *
 * @return  {Array<string, Type>}               A list of filename->property mappings
 */
export function extractFromFileDescriptors<Key extends keyof MDFileDescriptor, Type = MDFileDescriptor[Key]> (descriptors: AnyDescriptor[], prop: Key): Array<[string, Type]> {
  const retVals: Array<[string, Type]> = []
  for (const descriptor of descriptors) {
    if (descriptor.type === 'file') {
      retVals.push([ descriptor.path, descriptor[prop] ])
    }
  }

  return retVals
}
