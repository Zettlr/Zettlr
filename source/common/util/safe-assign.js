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
 * Overwrites properties on the referenceObject, if they also occur in obj.
 * @param {any} obj The new object to be safe assigned
 * @param {any} referenceObject The reference to use the props from
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
      if (typeof referenceObject[prop] === 'object' &&
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
}

/**
 * Returns a clone of the reference object with updated keys
 * as they also occur on the passed obj.
 *
 * @param   {any}  obj        The object to use the values from.
 * @param   {any}  reference  The reference to use the keys from.
 *
 * @return  {any}             The clone with keys from reference and values from object.
 */
module.exports = function (obj, reference) {
  // Make sure to clone the reference object, so that users
  // do not have to worry about doing this themselves.
  let clone = JSON.parse(JSON.stringify(reference))
  // After cloning, safely assign the object to the reference
  safeAssign(obj, clone)
  return clone
}
