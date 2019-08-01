/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The contained file can find an object in an arbitrary tree.
 *
 * END HEADER
 */

/**
 * Traverses an arbitrary recursive object tree to find an object with a specific prop=val.
 * @param {Object} tree The tree to traverse
 * @param {String} prop The property that should be matched
 * @param {Mixed} val The value that the property should be checked for
 * @param {string} traverse The property over which the function traverses the tree
 * @returns {Mixed} Either an object with the correct hash, or undefined.
 */
module.exports = function findObject (tree, prop, val, traverse) {
  // Is the tree even defined?
  if (!tree) return undefined
  // First let's see if we can shortcut
  if (!Array.isArray(tree) && tree.hasOwnProperty(prop) && tree[prop] === val) return tree

  // Now search the tree
  let ret
  if (Array.isArray(tree)) {
    // The tree itself is an array
    for (let item of tree) {
      ret = findObject(item, prop, val, traverse)
      if (ret) break // Found it!
    }
  } else if (tree.hasOwnProperty(traverse) && Array.isArray(tree[traverse])) {
    // The descendants are an array
    for (let descendant of tree[traverse]) {
      ret = findObject(descendant, prop, val, traverse)
      if (ret) break // Found it!
    }
  } else if (tree.hasOwnProperty(traverse)) {
    // Neither tree nor descendants are an array -> simple traverse
    ret = findObject(tree[traverse], prop, val, traverse)
  }
  return ret
}
