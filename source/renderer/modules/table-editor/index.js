const TableEditor = require('./table-editor')
const parsePipeTable = require('./parse-pipe')
const parseSimpleTable = require('./parse-simple')
const parseGridTable = require('./parse-grid')

module.exports = {
  /**
   * Rebuilds the full AST and the DOM element from the given Markdown table.
   * Throws errors if it encounters any errors while parsing.
   * @param  {string|array} markdownTable The Markdown table, either as string or line array.
   * @param {string} potentialType Indicates which type of Pandoc Markdown table this might be.
   * @return {void}               Does not return.
   */
  fromMarkdown: function (markdownTable, potentialType = 'pipe', hooks = null) {
    let parsed
    switch (potentialType) {
      case 'simple':
        parsed = parseSimpleTable(markdownTable)
        break
      case 'grid':
        parsed = parseGridTable(markdownTable)
        break
      default:
        parsed = parsePipeTable(markdownTable)
        break
    }

    // Now parse the whole thing into the table editor.
    const editor = new TableEditor(parsed.ast, parsed.colAlignments, potentialType, hooks)

    return editor
  }
}
