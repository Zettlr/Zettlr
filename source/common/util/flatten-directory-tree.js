/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to convert trees to arrays.
 *
 * END HEADER
 */

/**
 * This function flattens an object tree (file tree) to an array.
 * @param  {Object} tree        A descriptor, can be a tree or a single object.
 * @return {Mixed}              An array.
 */
module.exports = function flattenDirectoryTree (tree) {
  let newarr = []
  // In case of completely empty stuff, simply return an empty array
  if (tree == null || (Array.isArray(tree) && tree.length === 0)) {
    return []
  }

  if (tree.type === 'file') {
    return [tree] // well ...
  } else if (tree.type === 'directory') {
    // Append directory (for easier overview)
    newarr.push(tree)
    if (tree.hasOwnProperty('children') && tree.children != null) {
      for (let c of tree.children) {
        newarr.concat(flattenDirectoryTree(c))
      }
    }
    return newarr
  }
}
