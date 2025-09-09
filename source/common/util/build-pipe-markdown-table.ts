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
  const numCols = ast[0].length
  const sizes: number[] = Array(numCols).fill(0)

  for (const row of ast) {
    for (let idx = 0; idx < numCols; idx++) {
      const cell = row[idx]

      let cellLength = cell.length
      if (cell.includes('\n')) {
        // Multi-line cell -> take the longest of the containing rows
        cellLength = Math.max(...cell.split('\n').map(x => x.length))
      }

      if (cellLength > sizes[idx]) {
        sizes[idx] = cellLength
      }
    }
  }

  return sizes
}

export function buildPipeMarkdownTable (ast: string[][], colAlignment: Array<'center'|'left'|'right'|null>): string {
  if (ast.length < 2) {
    throw new Error('Cannot build pipe table: Must have at least two rows.')
  }

  // First, calculate the column sizes
  const colSizes = calculateColSizes(ast)

  // Then, build the table in a quick MapReduce fashion
  const rows = ast.map(row => {
    const rowContents = row.map((cell, idx) => {
      let pad = Math.max(colSizes[idx], 1)

      switch (colAlignment[idx]) {
        case 'left':
          return cell.padEnd(pad, ' ')
        case 'right':
          return cell.padStart(pad, ' ')
        case 'center':
          pad = pad - cell.length
          return ' '.repeat(Math.floor(pad/2)) + cell + ' '.repeat(Math.ceil(pad/2))
        default:
          return cell.padEnd(pad, ' ')
      }
    }).join(' | ')
    return `| ${rowContents} |`
  })

  // Finally, insert the required header row at index 2
  const headerRowContents = colSizes.map((size, idx) => {
    switch (colAlignment[idx]) {
      case 'left':
        return ':' + '-'.repeat(Math.max(size + 1, 2))
      case 'right':
        return '-'.repeat(Math.max(size + 1, 2)) + ':'
      case 'center':
        return ':' + '-'.repeat(Math.max(size, 1)) + ':'
      default:
        return '-'.repeat(Math.max(size + 2, 3))
    }
  }).join('|')

  const headerRow = `|${headerRowContents}|`
  rows.splice(1, 0, headerRow)

  return rows.join('\n')
}
