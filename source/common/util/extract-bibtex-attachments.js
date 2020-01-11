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

const path = require('path')
const AstrociteAST = require('astrocite').bibtex.AST
const pdfSorter = require('./sort-by-pdf')

/**
 * Returns a dictionary in the form citeKey: Array(files)
 * @param {String} fileContents The contents of a valid BibTex file
 * @param {String} baseDir The base directory to use in case the links are relative.
 * @return {Object} Returns a dictionary containing all extracted files
 */
module.exports = function (fileContents, baseDir = '') {
  let ast = AstrociteAST.parse(fileContents)
  // Return value will be a fast-access dictionary
  let files = Object.create(null)

  // First, filter out all the entries (there could also be TextEntries or Comments)
  let entries = ast.children.filter(elem => elem.kind === 'Entry')

  // Now let's see what entries have files attached.
  // Such attributes are stored in properties within the entry.
  for (let entry of entries) {
    for (let property of entry.properties) {
      if (property.key === 'file') {
        // The file entry by JabRef is saved as description:path:type
        // Multiple entries are delimited with ;
        // Reference: https://github.com/JabRef/jabref/blob/93f47c9069d01247375cabbe6e1328f0a477472b/src/main/java/org/jabref/gui/filelist/FileListEntry.java#L46
        let f = property.value[0].value.split(';')
        f = f.map(elem => elem.split(':')[1]) // Extract the file paths
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
    if (files[entry.id] === undefined) files[entry.id] = false
  }

  return files
}
