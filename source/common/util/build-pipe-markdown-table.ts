/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        buildPipeMarkdownTable
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains a utility function to generate a pipe
 *                  table from scratch.
 *
 * END HEADER
 */

/**
 * Calculates the maximum size (characters) of each column of a table AST
 *
 * @param   {string[][]}  ast  The AST
 *
 * @return  {number[]}       The maximum sizes for all columns
 */
export default function calculateColSizes (ast: string[][]): number[] {
  const sizes = []
  for (let col = 0; col < ast[0].length; col++) {
    let colSize = 0
    for (let row = 0; row < ast.length; row++) {
      const cell = ast[row][col]
      let cellLength = cell.length
      if (cell.includes('\n')) {
        // Multi-line cell -> take the longest of the containing rows
        cellLength = Math.max(...cell.split('\n').map(x => x.length))
      }

      if (cellLength > colSize) {
        colSize = cellLength
      }
    }
    sizes.push(colSize)
  }
  return sizes
}

export function buildPipeMarkdownTable (ast: string[][], colAlignment: Array<'center'|'left'|'right'>): string {
  if (ast.length < 2) {
    throw new Error('Cannot build pipe table: Must have at least two rows.')
  }

  // First, calculate the column sizes
  const colSizes = calculateColSizes(ast)

  // Then, build the table in a quick MapReduce fashion
  const rows = ast.map(row => {
    const rowContents = row.map((col, idx) => {
      if (colAlignment[idx] === 'right') {
        return col.padStart(colSizes[idx], ' ')
      } else {
        return col.padEnd(colSizes[idx], ' ')
      }
    }).join(' | ')
    return `| ${rowContents} |`
  })

  // Finally, insert the required header row at index 2
  const headerRowContents = colSizes.map((size, idx) => {
    if (colAlignment[idx] === 'left') {
      return '-'.repeat(size + 2)
    } else if (colAlignment[idx] === 'center') {
      return ':' + '-'.repeat(size) + ':'
    } else {
      return '-'.repeat(size + 1) + ':'
    }
  }).join('|')

  const headerRow = `|${headerRowContents}|`
  rows.splice(1, 0, headerRow)

  return rows.join('\n')
}
