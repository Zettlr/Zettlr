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

import { ParsedTable, ColAlignment } from './types'

/**
 * Parses a grid table
 * @param {String|Array} A markdown table, either as line array or string
 * @returns {Object} An object with properties ast and colAlignments
 */
export default function parseGridTable (markdownTable: string|string[]): ParsedTable {
  // First remove whitespace from both sides of the table, e.g. in case
  // a trailing newline is present
  if (typeof markdownTable === 'string') {
    markdownTable = markdownTable.trim()
  }

  if (!Array.isArray(markdownTable)) {
    markdownTable = markdownTable.split('\n')
  }

  if (markdownTable.length === 0 || (markdownTable.length === 1 && markdownTable[0].trim() === '')) {
    throw new SyntaxError('Could not parse grid table: empty!')
  }

  const ast: string[][] = []
  const colAlignments: ColAlignment[] = [] // One-dimensional column alignments
  let numColumns = 0 // If there is an uneven number of columns, throw an error.

  // The speciality of grid tables is that they can contain the alignment info
  // either in the first row, or in the second separator row. So we have to find
  // the alignment prior to iterating over the rows.
  let headerRow = 0
  for (let i = 0; i < markdownTable.length; i++) {
    if (/^[:+= ]+$/.test(markdownTable[i])) { // "Real" headers have = instead of -
      headerRow = i
      break
    }
  }

  let headerContent: string|string[] = markdownTable[headerRow]

  headerContent = headerContent.split('+').slice(1, -1)
  for (let i = 0; i < headerContent.length; i++) {
    const col = headerContent[i].trim()
    if (col.startsWith(':') && col.endsWith(':')) {
      colAlignments[i] = 'center'
    } else if (col.endsWith(':')) {
      colAlignments[i] = 'right'
    } else {
      colAlignments[i] = 'left'
    }
  }

  // Now iterate over all table rows
  let hasSeenSeparatorLine = false
  for (let i = 0; i < markdownTable.length; i++) {
    const row = markdownTable[i]

    // There should not be empty lines in the table.
    // If so, this indicates an error in the render tables plugin!
    if (row.trim() === '') {
      throw new SyntaxError(`Could not parse grid table: Line ${i + 1} was empty!`)
    }

    if (row.startsWith('+') && hasSeenSeparatorLine) {
      throw new SyntaxError('Could not parse grid table: Found multiple separator rows!')
    }

    if (row.startsWith('+')) {
      hasSeenSeparatorLine = true
      continue // Skip separation lines
    }

    if (!row.startsWith('|')) {
      throw new Error(`Could not parse grid table: Row ${i + 1} did not start with + or |!`)
    }

    // Split to columns
    const cols = row.split('|').map(elem => elem.trim()).slice(1, -1)

    if (numColumns === 0) {
      numColumns = cols.length // First row determines column count ...
    } else if (numColumns !== cols.length) { // ... subsequent rows check against this.
      throw new SyntaxError(`Could not parse grid table: Found ${row.length} columns on line ${i + 1} (should be ${numColumns}).`)
    }

    if (hasSeenSeparatorLine) {
      // Add the whole row to the AST
      ast.push(cols)
    } else {
      // There was no separator line in between --> multi-line table --> add the
      // current columns to the previous ones (including newlines).
      for (let j = 0; j < numColumns; j++) {
        ast[ast.length - 1][j] += '\n' + cols[j]
      }
    }

    hasSeenSeparatorLine = false
  }

  if (ast.length === 0 || ast[0].length === 0) {
    // This AST does not look as it's supposed to -> abort
    throw new SyntaxError('Could not parse grid table: The parsed AST was empty.')
  }

  // Cleanup: Remove trailing newlines (that can occur if we have a row where
  // more than zero but not all columns were multi-line)
  for (let row = 0; row < ast.length; row++) {
    for (let col = 0; col < ast[0].length; col++) {
      if (ast[row][col].endsWith('\n')) {
        ast[row][col] = ast[row][col].slice(0, -1)
      }
    }
  }

  // Return the AST
  return { ast, colAlignments }
}
