/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to determine a
 *                  callback is actually a function.
 *
 * END HEADER
 */

/**
* Returns true, if the passed callback is actually callable.
* @param  {Function} callback The callback variable that should be tested
* @return {Boolean}        Whether or not the given callback is actually callable.
*/
export default function (callback: any): boolean {
  // We are calling the toString-function of the object prototype, as we can
  // be sure it returns Function, if the callback was actually a function.
  // We could also use the toString-method from any newly created object {},
  // as it will inherit the unaltered tostring method from Object.prototype.
  // Further reading: http://luxiyalu.com/object-prototype-tostring-call/
  return Object.prototype.toString.call(callback) === '[object Function]'
}
