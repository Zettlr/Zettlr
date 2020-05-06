/**
* @ignore
* BEGIN HEADER
*
* Contains:        TableHelper utility function
* CVM-Role:        Utility
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This parser transforms pipe tables as specified
*                  in the Pandoc manual into an AST and returns both
*                  that and the column alignments.
*                  Cf. https://pandoc.org/MANUAL.html#tables
*
* END HEADER
*/

/**
 * Parses a pipe table
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

  // Now iterate over all table rows
  for (let i = 0; i < markdownTable.length; i++) {
    // There should not be empty lines in the table.
    // If so, this indicates an error in the render tables plugin!
    if (markdownTable[i].trim() === '') throw new Error(`Line ${i} in the table was empty!`)
    let row = markdownTable[i].trim() // Clean up whitespace
    if (/^[- :+|]+$/.test(row)) {
      // We have an alternative pipetable, separated with + instead of |,
      // so we have to replace all instances of + with |
      row = row.replace(/\+/g, '|')
    }

    // Split to columns
    row = row.split('|')

    // Now, expect that the first and last "column" are empty and remove them.
    // If they are not empty, we probably have a pipe table without surrounding
    // pipes.
    if (row[0].trim() === '') row.shift()
    if (row[row.length - 1].trim() === '') row.pop()

    // First row determines the amount of columns expected
    if (!numColumns) numColumns = row.length
    if (numColumns !== row.length) {
      throw new Error(`Malformed Markdown Table! Found ${row.length} columns on line ${i} (should be ${numColumns}).`)
    }

    // First test if we've got a header row. A header row is defined of
    // consisting of columns only containing dashes, colons and spaces. The
    // first column to break this rule means we don't have a valid header.
    let isHeader = true
    for (let col of row) {
      if (!/^[-: ]+$/.test(col) || col.trim() === '') {
        // Note we have to check for completely blank lines
        isHeader = false
        break
      }
    }

    // Parse the header
    if (isHeader) {
      for (let j = 0; j < row.length; j++) {
        let col = row[j].trim()
        if (col[0] === ':' && col[col.length - 1] === ':') {
          colAlignments[j] = 'center'
        } else if (col[col.length - 1] === ':') {
          colAlignments[j] = 'right'
        } else {
          colAlignments[j] = 'left'
        }
      }
      continue // We're done here -- don't add it to the AST
    }

    // We have a normal table row, so parse all columns
    let cols = []
    for (let j = 0; j < row.length; j++) {
      cols.push(row[j].trim()) // Trim whitespaces
    }

    // Add the whole row to the AST
    ast.push(cols)
  }

  // If we have reached this stage, but no header row was found,
  // preset all column alignments with left
  if (colAlignments.length === 0) {
    for (let i = 0; i < numColumns; i++) {
      colAlignments.push('left')
    }
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
