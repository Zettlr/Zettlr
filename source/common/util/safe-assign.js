/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a function that can be used to safely
 *                  assign object values, that is: you pass a reference
 *                  object, and some other object. What will be returned is a
 *                  new object that contains all fields from the reference, but
 *                  does not include any "invalid" fields that were only
 *                  present on the passed object, but not on the reference.
 *                  This also supports nested objects.
 *
 * END HEADER
 */

/**
 * Safely assigns obj's values to referenceObject, omitting any value not
 * present on referenceObject.
 * @param {Object} obj The new object to be safe assigned
 * @param {Object} referenceObject The reference to use the props from
 */
function safeAssign (obj, referenceObject) {
  // Overwrite all given attributes (and leave the not given in place)
  // This will ensure sane defaults.
  for (var prop in referenceObject) {
    if (obj.hasOwnProperty(prop)) {
      // safeAssign updates even nested objects, which we'll
      // do here. The "else" is for primitives. "Why do you
      // check for the prop being null, when you also made
      // sure it's an object?" you may ask. Well, because
      // JavaScript treats "null" as type of "object".
      if ((typeof referenceObject[prop] === 'object') &&
        !Array.isArray(referenceObject[prop]) &&
        referenceObject[prop] !== null) {
        // Update the sub-object
        safeAssign(obj[prop], referenceObject[prop])
      } else {
        // Assign the primitive
        referenceObject[prop] = obj[prop]
      }
    } // Skip the prop, because the object doesn't have it
  }

  return referenceObject
}

module.exports = function (obj, reference) {
  // Make sure to clone the reference object, so that users
  // do not have to worry about doing this themselves.
  reference = JSON.parse(JSON.stringify(reference))
  return safeAssign(obj, reference)
}
