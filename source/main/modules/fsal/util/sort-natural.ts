/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to sort Files by name
 *                  (with language support).
 *
 * END HEADER
 */

import {
  CodeFileDescriptor,
  DirDescriptor,
  MDFileDescriptor
} from '../types'

/**
 * Helper function to sort files using a collator
 * @param  {ZettlrFile} a A ZettlrFile exposing a name property
 * @param  {ZettlrFile} b A ZettlrFile exposing a name property
 * @return {number}   0, 1, or -1, depending upon what the comparision yields.
 */
export default function (
  a: MDFileDescriptor | DirDescriptor | CodeFileDescriptor,
  b: MDFileDescriptor | DirDescriptor | CodeFileDescriptor
): number {
  let aSort = a.name.toLowerCase()
  let bSort = b.name.toLowerCase()

  const useH1: boolean = global.config.get('display.useFirstHeadings')

  // Check for firstHeadings, if applicable
  if (useH1 && a.type === 'file') {
    if (a.firstHeading != null) aSort = a.firstHeading.toLowerCase()
  }

  if (useH1 && b.type === 'file') {
    if (b.firstHeading != null) bSort = b.firstHeading.toLowerCase()
  }

  // Second, check for frontmatter, as this overwrites
  if (a.type === 'file' && a.frontmatter !== null) {
    if (
      a.frontmatter.hasOwnProperty('title') === true &&
      typeof a.frontmatter.title === 'string'
    ) {
      aSort = a.frontmatter.title.toLowerCase()
    }
  }

  if (b.type === 'file' && b.frontmatter !== null) {
    if (
      b.frontmatter.hasOwnProperty('title') === true &&
      typeof b.frontmatter.title === 'string'
    ) {
      bSort = b.frontmatter.title.toLowerCase()
    }
  }

  const languagePreferences = [ global.config.get('appLang'), 'en' ]

  let coll = new Intl.Collator(languagePreferences, { 'numeric': true })

  return coll.compare(aSort, bSort)
}
