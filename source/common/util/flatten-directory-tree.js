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
 * @param  {Object} tree        A GettlrDir tree
 * @param  {Array}  [newarr=[]] Needed for recursion. Do not use.
 * @return {Mixed}             An array or nothing.
 */
function flattenDirectoryTree (tree, newarr = []) {
  // In case of completely empty stuff, simply return an empty array
  if (tree == null || tree.length === 0) {
    return []
  }

  if (tree.type === 'file') {
    return newarr.push(tree)
  } else if (tree.type === 'directory' || tree.type === 'virtual-directory') {
    // Append directory (for easier overview)
    newarr.push(tree)
    if (tree.children != null) {
      for (let c of tree.children) {
        newarr.concat(flattenDirectoryTree(c, newarr))
      }
    }
    return newarr
  }
}

module.exports = flattenDirectoryTree
