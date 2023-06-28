/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getBibliographyForDescriptor
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A simple utility function making it easy to retrieve a file's
 *                  citation library.
 *
 * END HEADER
 */

import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import type { MDFileDescriptor } from '@dts/common/fsal'

/**
 * Takes a descriptor and returns the appropriate citation library for it. NOTE:
 * You still have to check whether there is a library loaded, this simply returns
 * a path (or the CITEPROC_MAIN_DB constant).
 *
 * @param   {MDFileDescriptor}  descriptor  The descriptor
 *
 * @return  {string}                        The appropriate library
 */
export function getBibliographyForDescriptor (descriptor: MDFileDescriptor): string {
  let library = CITEPROC_MAIN_DB

  if (descriptor.frontmatter != null && 'bibliography' in descriptor.frontmatter) {
    library = descriptor.frontmatter.bibliography

    if (Array.isArray(library)) {
      // While multiple bibliography libraries are supported by Pandoc, Zettlr
      // cannot properly merge multiple libraries together, so we'll simply use
      // the first found.
      library = library[0]
    }
  }

  if (typeof library === 'string') {
    library = library.trim()
  }

  if (library === '' || library === undefined) {
    library = CITEPROC_MAIN_DB
  }

  return library
}
