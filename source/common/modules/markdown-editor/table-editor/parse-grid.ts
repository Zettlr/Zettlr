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
  if (typeof markdownTable === 'string') markdownTable = markdownTable.trim()
  if (!Array.isArray(markdownTable)) markdownTable = markdownTable.split('\n')

  if (markdownTable.length === 0 || (markdownTable.length === 1 && markdownTable[0].trim() === '')) {
    throw new Error('MarkdownTable was empty!')
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
  for (let i = 0; i < markdownTable.length; i++) {
    // There should not be empty lines in the table.
    // If so, this indicates an error in the render tables plugin!
    if (markdownTable[i].trim() === '') {
      throw new Error(`Line ${i} in the table was empty!`)
    }

    const row: string|string[] = markdownTable[i].trim() // Clean up whitespace
    if (row.startsWith('+')) {
      continue // Skip separation lines
    }

    if (!row[0].startsWith('|')) {
      throw new Error(`Malformed Markdown Table! Row ${i} did not start with + or |!`)
    }

    // Split to columns
    const cols = row.split('|').map(elem => elem.trim()).slice(1, -1)

    // First row determines the amount of columns expected
    if (numColumns === 0) {
      numColumns = cols.length // Basically: First row determines column count ...
    } else if (numColumns !== cols.length) { // ... subsequent rows check against this.
      throw new Error(`Malformed Markdown Table! Found ${row.length} columns on line ${i} (should be ${numColumns}).`)
    }

    // Add the whole row to the AST
    ast.push(cols)
  }

  if (ast.length === 0 || ast[0].length === 0) {
    // This AST does not look as it's supposed to -> abort
    throw new Error('Malformed Markdown Table! The parsed AST was empty.')
  }

  // Return the AST
  return { ast, colAlignments }
}
