/**
 * Crunches a recursive object tree into a one-dimensional array.
 * @param {Object} tree The tree to be transformed
 * @param {String} traverse The property over which the recursion takes place
 * @param {Array} arr An optional array to append to
 */
module.exports = function objectToArray (tree, traverse, arr = []) {
  if (!tree) return arr

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
