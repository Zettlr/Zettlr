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

import calculateColSizes from './calculate-col-sizes'
import type { ColAlignment } from './types'

export default function buildPipeTable (ast: string[][], colAlignment: ColAlignment[]): string {
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
