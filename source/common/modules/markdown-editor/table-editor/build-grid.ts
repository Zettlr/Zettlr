/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableHelper utility function
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Transforms an AST to a grid table.
 *                  Cf. https://pandoc.org/MANUAL.html#tables
 *
 * END HEADER
 */

import calculateColSizes from './calculate-col-sizes'
import type { ColAlignment } from './types'

/**
 * Takes a set of AST columns and returns the number of lines they will span if
 * built as a string table
 *
 * @param   {string[]}  columns  The column contents
 *
 * @return  {number}             The amount of raw Markdown lines required to render
 */
function calcRawCellRows (columns: string[]): number {
  return Math.max(...columns.map(col => col.split('\n').length))
}

/**
 * Builds a header row for a grid table, based on the column sizes and the
 * alignment. As a symbol, pass in '=' if the grid table has a header row, or
 * '-' if it does not, and place this row accordingly.
 *
 * @param   {number[]}        colSizes      The column sizes of the table
 * @param   {ColAlignment[]}  colAlignment  The alignment specs
 * @param   {'='|'-'}         symbol        The symbol (depends on header row)
 *
 * @return  {string}                        The built grid header row
 */
function buildGridHeaderRow (colSizes: number[], colAlignment: ColAlignment[], symbol: '='|'-'): string {
  let headerRow = '+'
  for (let col = 0; col < colSizes.length; col++) {
    // Respect the spaces left and right and account for alignment
    switch (colAlignment[col]) {
      case 'left':
        headerRow += symbol.repeat(colSizes[col] + 2) + '+'
        break
      case 'center':
        headerRow += ':' + symbol.repeat(colSizes[col]) + ':+'
        break
      case 'right':
        headerRow += symbol.repeat(colSizes[col] + 1) + ':+'
        break
    }
  }
  return headerRow
}

export default function buildGridTable (ast: string[][], colAlignment: ColAlignment[], hasHeader: boolean = true): string {
  // Setup: colSizes is the maximum length of any cell inside the given column
  const colSizes = calculateColSizes(ast)
  const numRows = ast.length
  const numCols = colSizes.length

  // This is a template separator row, added in between each row
  const sep = '+' + colSizes.map(elem => '-'.repeat(elem + 2)).join('+') + '+'
  const header = buildGridHeaderRow(colSizes, colAlignment, hasHeader ? '=' : '-')

  // Begin the table with a separator row
  const rows: string[] = []
  if (hasHeader) {
    rows.push(sep)
  } else {
    // Custom header row (similar to below, but with '-' instead of '=')
    rows.push(header)
  }

  // Now iterate over every row in the table
  for (let row = 0; row < numRows; row++) {
    // A single row in the AST can span multiple actual rows, delimited by \n
    const actualRows = calcRawCellRows(ast[row])

    // This is an inner table used to prepare the columns inside this row for
    // stringification. We need to pre-fill it as we have to pivot the cells
    // from col/row to row/col ordering.
    const innerAST: string[][] = []
    for (let i = 0; i < actualRows; i++) {
      const innerRow = []
      for (let j = 0; j < numCols; j++) {
        innerRow.push('') // Arbitrary, will be overwritten below
      }
      innerAST.push(innerRow)
    }

    // After the preparation, iterate over the columns inside the row
    for (let col = 0; col < numCols; col++) {
      // Split into the individual "actual" rows of the cell, and pad to the
      // full length
      let splitCell = ast[row][col].split('\n')
      while (splitCell.length < actualRows) {
        splitCell.push('')
      }

      // Now, pad each "split" cell accordingly
      if (colAlignment[col] === 'right') {
        splitCell = splitCell.map(c => ' ' + c.padStart(colSizes[col]) + ' ')
      } else {
        splitCell = splitCell.map(c => ' ' + c.padEnd(colSizes[col]) + ' ')
      }

      // Now add all parts of the given cell to the inner table. Here, we pivot
      // the data from [col][row] to [row][col]
      for (let i = 0; i < actualRows; i++) {
        innerAST[i][col] = splitCell[i]
      }
    }

    // At this point we have one or more actual rows we have to build. The
    // contents are already correctly padded and stored as [row][col] arrays
    for (const rawRow of innerAST) {
      rows.push('|' + rawRow.join('|') + '|')
    }

    // After the first (logical) row we need a header row, which we build here.
    if (row === 0 && hasHeader) {
      rows.push(header)
    } else {
      // All other lines are followed by a separator.
      rows.push(sep)
    }
  }

  return rows.join('\n')
}
