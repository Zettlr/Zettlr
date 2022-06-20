import { DirMeta } from '@dts/common/fsal'

/**
 * Reconstructs a descriptor tree by re-assigning the parent properties to the
 * correct object references, instead of just numbers. NOTE: You still have to
 * assign the parent of the descriptor itself.
 *
 * @param   {DirMeta}  descriptor  The directory descriptor to reconstruct
 */
export default function reconstructTree (descriptor: DirMeta): void {
  for (const child of descriptor.children) {
    // @ts-expect-error
    child.parent = descriptor
    if (child.type === 'directory') {
      reconstructTree(child)
    }
  }
}
