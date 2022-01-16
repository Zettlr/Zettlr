/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Table rendering Plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin renders tables in place.
  *
  * END HEADER
  */

import CodeMirror, { commands, TextMarker } from 'codemirror'
import fromMarkdown from '../table-editor'
import { getTableHeadingRE } from '@common/regular-expressions'
import TableEditor from '../table-editor/table-editor'

const tableHeadingRE = getTableHeadingRE()

const tableList: Array<{ table: TableEditor, marker: TextMarker }> = []

function writeTableToDocument (cm: CodeMirror.Editor, table: TableEditor): boolean {
  // First, retrieve our marker-table tuple
  const elem = tableList.find(item => item.table === table)
  if (elem === undefined) {
    return false
  }

  const { marker } = elem
  // Don't replace some arbitrary text somewhere in the document!
  const currentPosition = marker.find() as CodeMirror.MarkerRange|undefined
  if (currentPosition === undefined) {
    return false
  }

  const md = table.getMarkdownTable().split('\n')
  // The markdown table has a trailing newline, which we need to
  // remove at all costs.
  md.pop()

  // Finally, before ripping everything apart, make sure that the table has
  // indeed changed
  const { from, to } = currentPosition

  const tableInDocument = cm.getRange(from, to)
  if (tableInDocument === md.join('\n')) {
    return false
  }

  // We'll simply replace the range with the new table.
  cm.replaceRange(md, from, to)
  // Remove the textmarker (if necessary) and immediately re-render the
  // table. Note that we cannot use the previous cursor position since the table
  // may have more rows now or more characters. The pivot point for us is the
  // `from` position, since that never changes. The correct `to` is the from-
  // line plus the amount of lines the table now has, and the character position
  // is equal to the length of the last line in the table.
  marker.clear()
  elem.marker = cm.markText(
    from,
    { line: from.line + md.length - 1, ch: md[md.length - 1].length },
    {
      clearOnEnter: false,
      replacedWith: table.domElement,
      inclusiveLeft: false,
      inclusiveRight: false
    }
  )
  return true
}

;(commands as any).markdownInsertTable = function (cm: CodeMirror.Editor) {
  // A small command that inserts a 2x2 table at the current cursor position.
  cm.replaceSelection('| | |\n| | |\n')
}

/**
 * This function renders tables using the TableEditor
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownRenderTables = function (cm: CodeMirror.Editor) {
  // Now render all potential new tables. We only check one line less
  // because such a table header WILL NEVER be on the last line, plus
  // this way we can check for Setext headers without having to worry.

  // Before checking for new tables, let's remove those that don't exist anymore
  for (const item of tableList) {
    if (item.marker.find() === undefined) {
      tableList.splice(tableList.indexOf(item), 1)
    }
  }

  // We'll only render the viewport
  const viewport = cm.getViewport()
  for (let i = viewport.from; i < viewport.to; i++) {
    if (cm.getModeAt({ line: i, ch: 0 }).name !== 'markdown-zkn') {
      continue
    }

    // First get the line and test if the contents resemble a table. We only
    // search for the heading rows here, because these are the only ones that
    // indicate a table. (Which is why none other than the really explicit
    // tables have syntax highlighting -- CodeMirror modes cannot do that).
    let firstLine // First line of a given table
    let lastLine // Last line of a given table
    let potentialTableType: 'pipe'|'simple'|'grid' = 'pipe' // Can be "grid", "pipe", "simple"

    const line = cm.getLine(i)
    const match = tableHeadingRE.exec(line)

    if (match == null) {
      continue // No table heading
    }

    if (match[1] !== undefined) {
      // Group 1 triggered, so we might have a simple table.
      const nextLine = cm.getLine(i + 1)
      if (nextLine === undefined || nextLine.trim() === '') {
        // Either end of document or a setext heading
        continue
      }

      if (i === 0 || cm.getLine(i - 1).trim() === '') {
        // We have a headless table, so let's search the end.
        firstLine = i // First line in this case is i

        for (let j = i + 1; j < cm.lineCount(); j++) {
          const l = cm.getLine(j)
          if (l.trim() === '') {
            break // Leave without setting lastLine
          }

          const m = tableHeadingRE.exec(l)
          if (m?.[1] !== undefined) {
            lastLine = j
            break
          }
        }
      } else {
        // We do not have a headless table
        firstLine = i - 1
        for (let j = i; j < cm.lineCount(); j++) {
          if (cm.getLine(j).trim() === '') {
            // First empty line marks the end of the table.
            lastLine = j - 1
            break
          }
        }
      }

      potentialTableType = 'simple'
    } else if (match?.[2] !== undefined) {
      // Group 2 triggered, so we maybe got a grid table. Grid tables may be
      // headerless or have a header. But the very first line will always
      // match the group, so we only have to look downward! As for pipe
      // tables, the first empty line marks the end of the table.
      // N.B.: We have this order of capturing groups because group 3 will
      // also match grid tables!
      firstLine = i
      for (let j = i + 1; j < cm.lineCount(); j++) {
        if (cm.getLine(j).trim() === '') {
          lastLine = j - 1
          break
        }
      }

      potentialTableType = 'grid'
    } else if (match?.[3] !== undefined) {
      // Group 3 triggered, so we might have a pipe table. A pipe table must
      // have a header, which means we'll have an easy time determining the
      // table boundaries.
      if (i === 0 || cm.getLine(i - 1).trim() === '') continue // Nope
      firstLine = i - 1
      for (let j = i; j < cm.lineCount(); j++) {
        if (cm.getLine(j).trim() === '') {
          lastLine = j - 1
          break
        }
      }

      potentialTableType = 'pipe'
    }

    // Something went wrong
    if (lastLine === undefined || firstLine === undefined || firstLine === lastLine) {
      continue
    }

    // We've got ourselves a table! firstLine and lastLine now demarcate the
    // lines from and to which it goes. But before we continue with the table,
    // we need to set i to lastLine, because otherwise the renderer will
    // produce sometimes even overlapping tables, especially with simple ones.
    i = lastLine

    // First check if the user is not inside that table
    const cur = cm.getCursor('from')
    if (cur.line >= firstLine && cur.line <= lastLine) {
      continue
    }

    const curFrom = { line: firstLine, ch: 0 }
    const curTo = { line: lastLine, ch: cm.getLine(lastLine).length }

    // We can only have one marker at any given position at any given time
    if (cm.findMarks(curFrom, curTo).length > 0) {
      continue
    }

    // A last sanity check: You could write YAML frontmatters by using only
    // dashes at the beginning and ending, which demarcates an edge condition.
    const beginningIsMd = cm.getModeAt(curFrom).name === 'markdown-zkn'
    // The mode will be Markdown again at the last character of the ending
    // separator from a YAML frontmatter, so it would render those as tables
    // as well. We have to check the FIRST character, as that would -- in the
    // case of a YAML frontmatter -- still be within YAML mode, not Markdown.
    const endingIsMd = cm.getModeAt({ line: curTo.line, ch: 0 }).name === 'markdown-zkn'

    if (!beginningIsMd || !endingIsMd) {
      continue
    }

    // First grab the full table
    const markdownTable = []
    for (let i = firstLine; i <= lastLine; i++) {
      markdownTable.push(cm.getLine(i))
    }

    // If the potential type is simple, there is one, last, final sanity check
    // we have to do: Users oftentimes forget to space out paragraphs when they
    // use Setext headings. That is, sometimes, the table editor will see
    // something like this:
    //
    // Some heading text
    // -----------------
    // The beginning of a paragraph
    //
    // This will lead to data loss, so we must make sure to not render simple
    // tables with one column.
    if (potentialTableType === 'simple' && markdownTable.length > 2 && /^-+$/.test(markdownTable[1])) {
      continue
    }

    // Now attempt to create a table from it.
    try {
      // Will raise an error if the table is malformed
      const table = fromMarkdown(markdownTable.join('\n'), potentialTableType, {
        // Detect mouse movement on the scroll element (so that
        // scroll detection in the helper works as expected)
        container: '#editor .CodeMirror .CodeMirror-scroll',
        onBlur: (table) => {
          console.log('On blur triggered, writing table ...')
          writeTableToDocument(cm, table)
        },
        onCellChange: (table) => {
          console.log('On change triggered, writing table ...')
          const tableChanged = writeTableToDocument(cm, table)
          if (tableChanged) {
            table.selectCell() // In this case, refocus the last selected cell
          }
        }
      })

      // Apply TextMarker
      const textMarker = cm.markText(
        curFrom, curTo,
        {
          clearOnEnter: false,
          replacedWith: table.domElement,
          inclusiveLeft: false,
          inclusiveRight: false
        }
      )

      tableList.push({ table, marker: textMarker })
    } catch (err: any) {
      console.error(`Could not instantiate table between ${firstLine} and ${lastLine}: ${err.message as string}`)
      // Error, so abort rendering.
      continue
    }
  }
}
