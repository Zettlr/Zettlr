/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to extract
 *                  BibLaTeX attachment entries from such a file.
 *
 * END HEADER
 */
import { type BiblatexParseResult } from 'bibliojson'
import path from 'path'
import pdfSorter from '@common/util/sort-by-pdf'

export function extractBibLaTeXAttachments (bib: BiblatexParseResult) {
  const attachments: Record<string, string[]|false> = {}

  const basePath = bib?.jabref?.meta?.fileDirectory ?? undefined

  // Now we also have to extract file fields (if they have been exported). The
  // BibLaTeX parser counts it as an unexpected field, accessible from
  // bib.entries[idx].unexpected_fields.file
  for (const [ _, item ] of Object.entries(bib.entries)) {
    if (!('unexpected_fields' in item)) {
      attachments[item.entry_key] = false
      continue
    }

    if (typeof item.unexpected_fields?.file !== 'string') {
      attachments[item.entry_key] = false
      continue
    }

    // At this point, we can be certain that the filePath exists. We now have to
    // treat its value. JabRef saves file attachments as description:path:type.
    // Multiple entries are delimited with ;.
    // Reference: https://github.com/JabRef/jabref/blob/93f47c9069d01247375cabbe6e1328f0a477472b/src/main/java/org/jabref/gui/filelist/FileListEntry.java#L46
    const fileAttachments = item.unexpected_fields.file.split(';')
    const files = fileAttachments
      // Zotero just writes the full absolute path to the file into the field,
      // while JabRef uses a global fileDirectory field + relative paths +
      // filetypes separated by colons.
      .map(val => val.includes(':') ? val.split(':')[1] : val)
      .map(filePath => !path.isAbsolute(filePath) && basePath ? path.join(basePath, filePath) : filePath)

    // Now sort so that PDF-files are at the top
    files.sort(pdfSorter)

    attachments[item.entry_key] = files
  }

  return attachments
}
