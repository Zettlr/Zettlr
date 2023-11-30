/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to extract
 *                  BibTex attachment entries from such a file.
 *
 * END HEADER
 */

import path from 'path'
import { bibtex } from 'astrocite'
import { type BracedComment } from 'astrocite-bibtex'
import pdfSorter from '@common/util/sort-by-pdf'
import type LogProvider from '@providers/log'

const AstrociteAST = bibtex.AST

type BibTexAttachments = Record<string, string[]|false>

/**
 * Returns a dictionary in the form citeKey: Array(files)
 * @param {String} fileContents The contents of a valid BibTex file
 * @param {String} baseDir The base directory to use in case the links are relative.
 * @return {Object} Returns a dictionary containing all extracted files
 */
export default function extractBibtexAttachments (
  fileContents: string,
  baseDir: string,
  logger?: LogProvider
): BibTexAttachments {
  const ast = AstrociteAST.parse(fileContents)
  // Return value will be a fast-access dictionary
  const files = Object.create(null)

  // First we search for the jabref comments containing the files' root directories
  const comments = ast.children.filter(item => item.kind === 'BracedComment') as BracedComment[]
  // The format of the value field is 'jabref-meta: fileDirectory*:<path>;'
  const jabrefComments = comments.filter(item => item.value.startsWith('jabref-meta:'))
  for (const entry of jabrefComments) {
    const value = entry.value.split(':').map(e => e.trim())
    if (value[1].startsWith('fileDirectory')) {
      baseDir = value[2].replace(/;/g, '')
      logger?.info(`[extractBibtexAttachments] Found a fileDirectory, overwriting baseDir: ${baseDir}`)
      break
    }
  }

  // Now let's see what entries have files attached.
  // Such attributes are stored in properties within the entry.
  for (const entry of ast.children) {
    if (entry.kind !== 'Entry') {
      continue
    }

    for (const property of entry.properties) {
      if (property.key === 'file') {
        const firstValue = property.value[0]
        if (firstValue.kind !== 'String' && firstValue.kind !== 'Text') {
          continue
        }

        // The file entry by JabRef is saved as description:path:type
        // Multiple entries are delimited with ;
        // Reference: https://github.com/JabRef/jabref/blob/93f47c9069d01247375cabbe6e1328f0a477472b/src/main/java/org/jabref/gui/filelist/FileListEntry.java#L46
        let f = firstValue.value.split(';')
        f = f.map(elem => {
          // Extract the file paths
          if (elem.includes(':')) {
            return elem.split(':')[1]
          } else {
            return elem
          }
        })
        // Now sort so that PDF-files are at the top
        f = f.sort(pdfSorter)

        // In case the paths are not absolute, make them this way.
        if (!path.isAbsolute(f[0])) {
          f = f.map(elem => path.join(baseDir, elem))
        }
        // Save them to the dictionary
        files[entry.id] = f
      }
    }

    // If the entry has not been assigned by now, this means there
    // are no files attached. -> Set it to false so one can easily
    // check if (!files[key]), as an array will evaluate to true.
    if (files[entry.id] === undefined) {
      files[entry.id] = false
    }
  }

  return files
}
