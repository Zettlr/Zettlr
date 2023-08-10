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
 * Merges an object with a reference, creating a new object that will contain
 * all properties of `referenceObject`. The value of those properties will
 * either be taken from the object, if it possesses that property, or from the
 * `referenceObject` otherwise.
 *
 * @param  {Partial<A>}  obj              The object with property values to be
 *                                        merged.
 * @param  {A}           referenceObject  The reference to use the properties
 *                                        and default values from.
 * @param  {Partial<A>}  newObject        DO NOT USE -- INTERNAL! The new object
 *                                        to be returned.
 *
 * @return {A}                            The cloned object with properties of
 *                                        `referenceObject` with values of `obj`
 *                                        merged in.
 */
export default function safeAssign <A extends object> (obj: Partial<A>, referenceObject: A, newObject: Partial<A> = {}): A {
  // Iterate over all properties of referenceObject
  for (const prop in referenceObject) {
    if (prop in obj) {
      // The object has the property, so now we have to decide over two cases:
      // either it's a sub-object --> in this case we'll have to apply
      // recursively. We perform an explicit null-check, since
      // `typeof null === 'object'`.
      if (typeof referenceObject[prop] === 'object' &&
        !Array.isArray(referenceObject[prop]) &&
        referenceObject[prop] !== null) {
        // @ts-expect-error These properties will be filled in recursively
        newObject[prop] = {}
        // @ts-expect-error TypeScript wouldn't not treat this as an error.
        // (To be fair, we do violence to the type system here.)
        safeAssign(obj[prop], referenceObject[prop], newObject[prop])
      } else {
        // Assign the primitive
        newObject[prop] = obj[prop]
      }
    } else {
      // `obj` doesn't have prop, so take the value from reference instead.
      newObject[prop] = referenceObject[prop]
    }
  }

  // Type-cast, since now newObject is of type A
  return newObject as A
}
