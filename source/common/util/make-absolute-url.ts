/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Kangie
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to absolutize URLs to
 *                  render images within the GUI.
 *
 * END HEADER
 */

import { getProtocolRE } from '../regular-expressions'

const path = window.path

const protocolRE = getProtocolRE()

/**
* Creates a definite absolute URL if the information suffices.
* @param {string} base The base path to be used
* @param {string} fragment The URL to be converted, either relative or absolute
* @returns {string} The converted absolute URL with a cachefree-parameter.
*/
export default function makeAbsoluteURL (base: string, fragment: string): string {
  let urlObject
  try {
    // If it's already a correct URL, we are almost done
    urlObject = new URL(fragment)
  } catch (err) {
    // Obviously not a correct URL. In the context of this limited
    // application, we can be sure base is always a path to a Markdown file.
    let resolvedPath = path.resolve(base, fragment)
    if (!protocolRE.test(resolvedPath)) resolvedPath = 'safe-file://' + resolvedPath
    urlObject = new URL(resolvedPath)
  }
  if (urlObject.protocol === 'file:') {
    // Windows C:/ etc. file paths are valid URLs,
    // but use the file:// protocol that we don't handle.
    return 'safe-' + urlObject.toString()
  }
  return urlObject.toString()
}
