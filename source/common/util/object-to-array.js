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
 * Crunches a recursive object tree into a one-dimensional array.
 * @param {Object} tree The tree to be transformed
 * @param {String} traverse The property over which the recursion takes place
 * @param {Array} arr An optional array to append to
 */
module.exports = function objectToArray (tree, traverse, arr = []) {
  // Add the current tree
  arr.push(tree)

  if (tree.hasOwnProperty(traverse) && Array.isArray(tree[traverse]) && tree[traverse].length > 0) {
    // We have some children -> concat them
    for (let child of tree[traverse]) {
      arr = objectToArray(child, traverse, arr)
    }
  }

  return arr
}
