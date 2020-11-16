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

module.exports = function (ast, colAlignment, colSizes) {
  let separatorRow = colSizes.map(elem => '-'.repeat(elem + 2))
  separatorRow = '+' + separatorRow.join('+') + '+\n'

  // First add a beginning row
  let markdownTable = separatorRow

  for (let i = 0; i < ast.length; i++) {
    for (let j = 0; j < ast[i].length; j++) {
      if (j === 0) markdownTable += '|'
      // Pad the text contents to fill up to the maximum chars
      switch (colAlignment[j]) {
        case 'left':
        case 'center':
          markdownTable += ` ${ast[i][j].padEnd(colSizes[j], ' ')} |`
          break
        case 'right':
          markdownTable += ` ${ast[i][j].padStart(colSizes[j], ' ')} |`
          break
      }
    }

    markdownTable += '\n'

    // First row is the header, so add a secondary row.
    if (i === 0) {
      markdownTable += '+'
      for (let k = 0; k < colSizes.length; k++) {
        // Respect the spaces left and right and account for alignment
        switch (colAlignment[k]) {
          case 'left':
            markdownTable += '='.repeat(colSizes[k] + 2) + '+'
            break
          case 'center':
            markdownTable += ':' + '='.repeat(colSizes[k]) + ':+'
            break
          case 'right':
            markdownTable += '='.repeat(colSizes[k] + 1) + ':+'
            break
        }
      }
      markdownTable += '\n'
    } else {
      // Add separators after each line
      markdownTable += separatorRow
    }
  }

  return markdownTable
}
