/**
* @ignore
* BEGIN HEADER
*
* Contains:        TableHelper utility function
* CVM-Role:        Utility
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This parser transforms grid tables as specified
*                  in the Pandoc manual into an AST and returns both
*                  that and the column alignments.
*                  Cf. https://pandoc.org/MANUAL.html#tables
*
* END HEADER
*/

/**
 * Parses a grid table
 * @param {String|Array} A markdown table, either as line array or string
 * @returns {Object} An object with properties ast and colAlignments
 */
module.exports = function (markdownTable) {
  // First remove whitespace from both sides of the table, e.g. in case
  // a trailing newline is present
  markdownTable = markdownTable.trim()
  if (!Array.isArray(markdownTable)) markdownTable = markdownTable.split('\n')

  if (markdownTable.length === 0) throw new Error('MarkdownTable was empty!')
  if (markdownTable.length === 1 && markdownTable[0].trim() === '') throw new Error('MarkdownTable was empty!')

  let ast = [] // Two-dimensional array
  let colAlignments = [] // One-dimensional column alignments
  let numColumns // If there is an uneven number of columns, throw an error.

  // The speciality of grid tables is that they can contain the alignment info
  // either in the first row, or in the second separator row. So we have to find
  // the alignment prior to iterating over the rows.
  let hasHeader = -1
  for (let i = 0; i < markdownTable.length; i++) {
    if (/^[:+= ]+$/.test(markdownTable[i])) { // "Real" headers have = instead of -
      hasHeader = i
      break
    }
  }

  let headerContent = markdownTable[0]
  // > 0 because header rows cannot be the first row
  if (hasHeader > 0) headerContent = markdownTable[hasHeader]

  headerContent = headerContent.substr(1, headerContent.length - 2).split('+')
  for (let i = 0; i < headerContent.length; i++) {
    let col = headerContent[i].trim()
    if (col[0] === ':' && col[col.length - 1] === ':') {
      colAlignments[i] = 'center'
    } else if (col[col.length - 1] === ':') {
      colAlignments[i] = 'right'
    } else {
      colAlignments[i] = 'left'
    }
  }

  // Now iterate over all table rows
  for (let i = 0; i < markdownTable.length; i++) {
    // There should not be empty lines in the table.
    // If so, this indicates an error in the render tables plugin!
    if (markdownTable[i].trim() === '') throw new Error(`Line ${i} in the table was empty!`)
    let row = markdownTable[i].trim() // Clean up whitespace
    if (row[0] === '+') continue // Skip separation lines
    if (row[0] !== '|') throw new Error(`Malformed Markdown Table! Row ${i} did not start with + or |!`)

    // Split to columns
    row = row.split('|')

    // Now, expect that the first and last "column" are empty and remove them.
    if (row[0].trim() === '') row.shift()
    if (row[row.length - 1].trim() === '') row.pop()

    // First row determines the amount of columns expected
    if (!numColumns) numColumns = row.length
    if (numColumns !== row.length) {
      throw new Error(`Malformed Markdown Table! Found ${row.length} columns on line ${i} (should be ${numColumns}).`)
    }

    // We have a normal table row, so parse all columns
    let cols = []
    for (let j = 0; j < row.length; j++) {
      cols.push(row[j].trim()) // Trim whitespaces
    }

    // Add the whole row to the AST
    ast.push(cols)
  }

  if (ast.length === 0 || ast[0].length === 0) {
    // This AST does not look as it's supposed to -> abort
    throw new Error('Malformed Markdown Table! The parsed AST was empty.')
  }

  // Return the AST
  return {
    'ast': ast,
    'colAlignments': colAlignments
  }
}
