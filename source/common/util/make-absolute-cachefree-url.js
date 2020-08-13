var protocolRE = /^([a-z]{1,10}):\/\//i
const path = require('path')

/**
* Creates a definite absolute URL if the information suffices.
* @param {string} base The base path to be used
* @param {string} fragment The URL to be converted, either relative or absolute
* @returns {string} The converted absolute URL with a cachefree-parameter.
*/
module.exports = function makeAbsoluteCachefreeURL (base, fragment) {
  let urlObject
  try {
    // If it's already a correct URL, we are almost done
    urlObject = new URL(fragment)
  } catch (e) {
    // Obviously not a correct URL. In the context of this limited
    // application, we can be sure base is always a path to a Markdown file.
    let resolvedPath = path.resolve(base, fragment)
    if (!protocolRE.test(resolvedPath)) resolvedPath = 'file://' + resolvedPath
    urlObject = new URL(resolvedPath)
  }

  // Now make the thing cachefree
  urlObject.searchParams.append('c', new Date().getTime())
  return urlObject.toString()
}
