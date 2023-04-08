/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        TableEditor
  * CVM-Role:        Model
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This class models Markdown tables using an internal AST and
  *                  enables easy WYSIWYG-style editing of tables.
  *
  * END HEADER
  */

import TableEditor from './table-editor'
import parsePipeTable from './parse-pipe'
import parseSimpleTable from './parse-simple'
import parseGridTable from './parse-grid'
import type { TableEditorOptions } from './types'

export default function fromMarkdown (markdownTable: string, hooks: TableEditorOptions = {}): TableEditor {
  // We support three types of tables: Grid tables, pipe tables, and simple tables.
  // Two of those types can be determined by looking at the first row, the third
  // is then the default.
  const firstRow = markdownTable.split('\n')[0]
  if (/^\+[-=+:]+\+$/.test(firstRow)) {
    // Must be a grid table
    const parsed = parseGridTable(markdownTable)
    return new TableEditor(parsed.ast, parsed.colAlignments, 'grid', hooks)
  } else if (/^(\|.+?\|)$|(.+?\|.+?)/.test(firstRow)) {
    // Must be a pipe table
    const parsed = parsePipeTable(markdownTable)
    return new TableEditor(parsed.ast, parsed.colAlignments, 'pipe', hooks)
  } else {
    // Fall back to simple table
    const parsed = parseSimpleTable(markdownTable)
    return new TableEditor(parsed.ast, parsed.colAlignments, 'simple', hooks)
  }
}
