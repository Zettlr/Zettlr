/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        objectToArray
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     objectToArray converts a tree-like object with nested
 *                  properties into a one-dimensional array.
 *
 * END HEADER
 */

/**
 * Crunches a recursive tree object into a one-dimensional array. If `tree` is
 * an array, runs the function on each element and concatenates the lists.
 *
 * @param   {any}    tree      The tree to be transformed. Can be an object or an array.
 * @param   {string} traverse  The property over which the recursion takes place
 * @param   {any[]}   arr      An optional array to append to
 *
 * @return  {any[]}            The flattened array
 */
export default function objectToArray<T extends Record<string, any>> (tree: T, traverse: string, arr: T[] = []): T[] {
  if (Array.isArray(tree)) {
    for (const elem of tree) {
      arr = objectToArray(elem, traverse, arr)
    }
    return arr
  }

  // Add the current tree
  arr.push(tree)

  if (traverse in tree && Array.isArray(tree[traverse]) && tree[traverse].length > 0) {
    // We have some children -> concat them
    for (const child of tree[traverse]) {
      arr = objectToArray(child, traverse, arr)
    }
  }

  return arr
}
