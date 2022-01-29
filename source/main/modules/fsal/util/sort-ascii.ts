/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to sort Files by name.
 *
 * END HEADER
 */

import { RequiredSortingProps } from './sort'

type FileNameDisplay = 'filename'|'title'|'heading'|'title+heading'

/**
 * Helper function to sort files by ascii characters
 * @param  {MDFileDescriptor | DirDescriptor,} a A ZettlrFile exposing a name property
 * @param  {MDFileDescriptor | DirDescriptor,} b A ZettlrFile exposing a name property
 * @return {number}                              0, 1, or -1
 */
export default function sortAscii <T extends RequiredSortingProps> (a: T, b: T): number {
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
    aSort = a.firstHeading as string
  }

  if (bHeading && useH1) {
    bSort = b.firstHeading as string
  }

  if (aTitle && useTitle) {
    aSort = a.frontmatter.title
  }

  if (bTitle && useTitle) {
    bSort = b.frontmatter.title
  }

  // Negative return: a is smaller b (case insensitive)
  if (aSort < bSort) {
    return -1
  } else if (aSort > bSort) {
    return 1
  } else {
    return 0
  }
}
