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

module.exports = function (ast, colAlignment, colSizes) {
  let markdownTable = ''
  // Now build from AST
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
      markdownTable += '|'
      for (let k = 0; k < colSizes.length; k++) {
        // Respect the spaces left and right and account for alignment
        switch (colAlignment[k]) {
          case 'left':
            markdownTable += '-'.repeat(colSizes[k] + 2) + '|'
            break
          case 'center':
            markdownTable += ':' + '-'.repeat(colSizes[k]) + ':|'
            break
          case 'right':
            markdownTable += '-'.repeat(colSizes[k] + 1) + ':|'
            break
        }
      }
      markdownTable += '\n'
    }
  }

  return markdownTable
}
