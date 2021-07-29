/**
* @ignore
* BEGIN HEADER
*
* Contains:        TableHelper utility function
* CVM-Role:        Utility
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This parser transforms simple tables as specified
*                  in the Pandoc manual into an AST and returns both
*                  that and the column alignments.
*                  Cf. https://pandoc.org/MANUAL.html#tables
*
* END HEADER
*/

/**
 * Parses a "simple" table ("simple", because it's not that simple)
 * @param {String|Array} A markdown table, either as line array or string
 * @returns {Object} An object with properties ast and colAlignments
 */
module.exports = function (markdownTable) {
  // Let's begin. First we need a line array. Make sure to strip potential
  // newlines from beginning and end, if applicable. Also perform some
  // initial sanity checks on the table.
  if (!Array.isArray(markdownTable)) markdownTable = markdownTable.split('\n')
  if (markdownTable[0].trim() === '') markdownTable.shift()
  if (markdownTable[markdownTable.length - 1].trim() === '') markdownTable.pop()
  if (markdownTable.length === 0) throw new Error('MarkdownTable was empty!')
  if (markdownTable.length === 1 && markdownTable[0].trim() === '') throw new Error('MarkdownTable was empty!')

  let ast = []
  let colAlignments = []
  let colSizes = [] // Yes, here we need the lengths of the columns
  let indentSizes = [] // Also yes: We need to know the padding between cols.

  // First, we need to determine the headers and the column alignments. As the
  // columns can be separated by an arbitrary amount of spaces, we need to
  // gauge the length AND the indentation by looking either at the first line
  // OR at the second line, depending on which one consists solely of dashes
  // and spaces.
  let determineLengthsWith = markdownTable[1]
  let determineAlignWith = markdownTable[0]
  if (/^[- ]+$/.test(markdownTable[0])) {
    // We got a headless table, so we need to swap the lines.
    determineLengthsWith = markdownTable[0]
    determineAlignWith = markdownTable[1]

    // Bonus round: According to the manual (TM) a headless table needs to have
    // a solely dashed line at the bottom.
    if (!/^[- ]+$/.test(markdownTable[markdownTable.length - 1])) {
      throw new Error('Malformed Markdown Table: Did not find a finishing dashed line for the table.')
    }
  }

  // Additional sanity check: The table is not allowed to be padded.
  if (determineLengthsWith[0] === ' ' || determineLengthsWith[determineLengthsWith.length - 1] === ' ') {
    throw new Error('The table is padded.')
  }

  // Now we first need the indent and column sizes
  let headerLineRE = /(-+| +)/g
  let match
  while ((match = headerLineRE.exec(determineLengthsWith)) !== null) {
    // This RegExp is able to extract single-character-substrings
    if (match[1][0] === '-') colSizes.push(match[1].length)
    if (match[1][0] === ' ') indentSizes.push(match[1].length)
  }

  // Now, determine the alignments. Do so by first splitting the respective
  // line according to the lengths and see where the whitespace is.
  let index = 0
  let indentIndex = 0
  for (let size of colSizes) {
    colAlignments.push(determineAlignWith.substr(index, size))
    index += size + (indentSizes[indentIndex] || 0)
    indentIndex++
  }

  // Transform the colAlignments containing real text into alignments
  for (let i = 0; i < colAlignments.length; i++) {
    let a = colAlignments[i]
    if (a[0] === ' ' && a[a.length - 1] === ' ') {
      colAlignments[i] = 'center'
    } else if (a[0] === ' ') {
      colAlignments[i] = 'right'
    } else {
      colAlignments[i] = 'left'
    }
  }

  // Now we should have column sizes and indentation sizes.
  // Next: Parse the full table according to these rules.
  for (let line of markdownTable) {
    if (/^[- ]+$/.test(line)) continue // Heading row
    let columns = []
    let index = 0
    let indentIndex = 0
    for (let size of colSizes) {
      // Here we can finally trim that ugly whitespace
      columns.push(line.substr(index, size).trim())
      index += size + (indentSizes[indentIndex] || 0)
      indentIndex++
    }
    ast.push(columns)
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
