/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to get a search regex.
 *
 * END HEADER
 */

/**
 * Creates a search term (always suitable to be used in new RegExp())
 * @param  {string} term A string that may contain a regular expression
 * @param {Array} [injectFlags=['i']] Flags to be injected into the expression
 * @return {Object}      A search term object with props term and flags.
 */
module.exports = function (term, injectFlags = []) {
  let re = {}

  // For ease of access you can simply pass the injectFlags as a string of characters
  if (typeof injectFlags === 'string') injectFlags = injectFlags.split('')
  // Failesafe
  if (!Array.isArray(injectFlags)) injectFlags = [injectFlags]

  // Test if we have a regular expression
  if (/^\/.+\/[gimy]{0,4}$/.test(term)) {
    // The user wants to do a regex search -> transform
    let r = term.split('/') // 0 is empty, last index contains flags, everthing else is expression
    r.shift() // Remove empty index 0
    re.flags = r.pop().split('').concat(injectFlags) // Retrieve the flags, convert to char array and concat
    re.term = r.join('/') // Reassemble the expression if it contained forward-slashes.
  } else {
    // User wants to do a simple search. Careful: Escape all raw regex chars!
    // Regex replacer taken from https://stackoverflow.com/a/6969486 (thanks!)
    re.term = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    re.flags = injectFlags.concat(['i']) // Always make a case-insensitive search
  }

  // The flags need to be unique and valid, so filter out any non-valid flags.
  re.flags = [...new Set(re.flags)].filter(flag => /[gimy]/.test(flag))
  return new RegExp(re.term, re.flags.join(''))
}
