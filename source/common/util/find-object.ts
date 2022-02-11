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
 *
 * @param   {any}            tree     The tree to traverse
 * @param   {string}         prop     The property that should be matched
 * @param   {any}            val      The value that the property should be checked for
 * @param   {string}         traverse The property over which the function traverses the tree
 *
 * @returns {any|undefined}           Either the correct object, or undefined
 */
export default function findObject (tree: any, prop: string, val: any, traverse: string): any|undefined {
  // Is the tree even defined?
  if (tree == null) {
    return undefined
  }

  // First let's see if we can shortcut
  if (!Array.isArray(tree) && prop in tree && tree[prop] === val) {
    return tree
  }

  // Now search the tree
  if (Array.isArray(tree)) {
    // The tree itself is an array
    for (const item of tree) {
      const ret = findObject(item, prop, val, traverse)
      if (ret !== undefined) {
        return ret
      }
    }
  } else if (traverse in tree && Array.isArray(tree[traverse])) {
    // The descendants are an array
    for (const descendant of tree[traverse]) {
      const ret = findObject(descendant, prop, val, traverse)
      if (ret !== undefined) {
        return ret
      }
    }
  } else if (traverse in tree) {
    // Neither tree nor descendants are an array -> simple traverse
    return findObject(tree[traverse], prop, val, traverse)
  }
}
