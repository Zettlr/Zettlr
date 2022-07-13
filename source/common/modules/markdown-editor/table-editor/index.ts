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
import { TableEditorOptions } from './types'

export default function fromMarkdown (markdownTable: string, potentialType: 'pipe'|'simple'|'grid' = 'pipe', hooks: TableEditorOptions = {}): TableEditor {
  switch (potentialType) {
    case 'simple': {
      const parsed = parseSimpleTable(markdownTable)
      return new TableEditor(parsed.ast, parsed.colAlignments, potentialType, hooks)
    }
    case 'grid': {
      const parsed = parseGridTable(markdownTable)
      return new TableEditor(parsed.ast, parsed.colAlignments, potentialType, hooks)
    }
    default: {
      const parsed = parsePipeTable(markdownTable)
      return new TableEditor(parsed.ast, parsed.colAlignments, potentialType, hooks)
    }
  }
}
