/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableHelper utility function
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This parser transforms an AST into a simple Table.
 *                  Cf. https://pandoc.org/MANUAL.html#tables
 *
 * END HEADER
 */

module.exports = function (ast, colAlignment, colSizes) {
  let markdownTable = ''
  // Now build from AST
  for (let i = 0; i < ast.length; i++) {
    for (let j = 0; j < ast[i].length; j++) {
      // Pad the text contents to fill up to the maximum chars
      let toFill = colSizes[j] - ast[i][j].length
      let start = Math.round(toFill / 2)
      let end = toFill - start
      start += 1
      switch (colAlignment[j]) {
        case 'left':
          markdownTable += ast[i][j].padEnd(colSizes[j] + 2, ' ')
          break
        case 'center':
          markdownTable += ' '.repeat(start) + ast[i][j] + ' '.repeat(end + 1)
          break
        case 'right':
          markdownTable += ast[i][j].padStart(colSizes[j] + 2, ' ')
          break
      }

      // Pad with one space
      if (j < ast[i].length - 1) markdownTable += ' '
    }

    markdownTable += '\n'

    // First row is the header, so add a secondary row.
    if (i === 0) {
      let r = colSizes.map(elem => '-'.repeat(elem + 2))
      markdownTable += r.join(' ') + '\n'
    }
  }

  return markdownTable
}
