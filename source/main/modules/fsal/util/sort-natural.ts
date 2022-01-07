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

type FileNameDisplay = 'filename'|'title'|'heading'|'title+heading'

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

  const aTitle = (a.type === 'file') ? typeof a.frontmatter?.title === 'string' : false
  const bTitle = (b.type === 'file') ? typeof b.frontmatter?.title === 'string' : false
  const aHeading = (a.type === 'file') ? a.firstHeading != null : false
  const bHeading = (b.type === 'file') ? b.firstHeading != null : false

  const fileNameDisplay: FileNameDisplay = global.config.get('fileNameDisplay')

  const useH1 = fileNameDisplay.includes('heading')
  const useTitle = fileNameDisplay.includes('title')

  // Use a heading level 1 if applicable, and, optionally, overwrite this with
  // the YAML frontmatter title variable

  if (aHeading && useH1) {
    aSort = (a as MDFileDescriptor).firstHeading as string
  }

  if (bHeading && useH1) {
    bSort = (b as MDFileDescriptor).firstHeading as string
  }

  if (aTitle && useTitle) {
    aSort = (a as MDFileDescriptor).frontmatter.title
  }

  if (bTitle && useTitle) {
    bSort = (b as MDFileDescriptor).frontmatter.title
  }

  const languagePreferences = [ global.config.get('appLang'), 'en' ]

  let coll = new Intl.Collator(languagePreferences, { 'numeric': true })

  return coll.compare(aSort, bSort)
}
