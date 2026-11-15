/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table selection regression tests
 * License:         GNU GPL v3
 *
 * Description:     Tests selection state, clipboard behavior, and DOM controls.
 *
 * END HEADER
 */

/* eslint-disable no-undef */
import { strictEqual, deepStrictEqual } from 'assert'
import { EditorState, type TransactionSpec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { parseTableNode } from 'source/common/modules/markdown-utils/markdown-ast/parse-table-node'
import markdownParser from 'source/common/modules/markdown-editor/parser/markdown-parser'
import {
  tableSelectionField, setTableSelection, selectTablePart, selectedTableMarkdown,
  cellIsSelected, clearSelectedCells, copyTableSelection, extendTableSelection, tableSelection
} from 'source/common/modules/markdown-editor/table-editor/selection'

import { updateTableControls } from 'source/common/modules/markdown-editor/table-editor/selection-controls'
import { history, undo } from '@codemirror/commands'

const TABLE = '| A | B | C |\n| :--- | ---: | :---: |\n| **one** | two | three |\n| four | five | six |'

function editor (doc = TABLE, cursor = doc.indexOf('two')): EditorView {
  let state = EditorState.create({
    doc, selection: { anchor: cursor }, extensions: [markdownParser(), tableSelectionField, history()]
  })
  return {
    get state () { return state },
    dispatch (...specs: TransactionSpec[]) { state = state.update(...specs).state },
    focus () {}
  } as unknown as EditorView
}

function rectangle (view: EditorView, row: number, col: number, endRow: number, endCol: number, tableFrom = 0): void {
  view.dispatch({ effects: setTableSelection.of({
    tableFrom, anchor: { row, col }, head: { row: endRow, col: endCol }
  }) })
}

describe('Table cell selections', function () {
  it('selects the row containing the cursor', function () {
    const view = editor()
    strictEqual(selectTablePart(view, 'row'), true)
    strictEqual(selectedTableMarkdown(view.state), '| | | |\n| :--- | ---: | :---: |\n| **one** | two | three |')
    strictEqual(view.state.doc.toString(), TABLE)
  })
  it('selects a column including its original alignment delimiter', function () {
    const view = editor()
    selectTablePart(view, 'column')
    strictEqual(selectedTableMarkdown(view.state), '| B |\n| ---: |\n| two |\n| five |')
  })
  it('copies the entire table verbatim', function () {
    const view = editor()
    selectTablePart(view, 'table')
    strictEqual(selectedTableMarkdown(view.state), TABLE)
  })
  it('handles a backwards rectangular selection without including other cells', function () {
    const view = editor()
    rectangle(view, 2, 2, 1, 1)
    strictEqual(selectedTableMarkdown(view.state), '| | |\n| ---: | :---: |\n| two | three |\n| five | six |')
    strictEqual(cellIsSelected(view.state.field(tableSelectionField), 0, 1, 1), true)
    strictEqual(cellIsSelected(view.state.field(tableSelectionField), 0, 1, 0), false)
    strictEqual(cellIsSelected(view.state.field(tableSelectionField), 100, 1, 1), false)
  })
  it('preserves Markdown formatting and escaped pipes in a partial selection', function () {
    const doc = '| A | B |\n| --- | --- |\n| **bold** | a\\|b |'
    const view = editor(doc, doc.indexOf('bold'))
    rectangle(view, 1, 1, 1, 1)
    strictEqual(selectedTableMarkdown(view.state), '| |\n| --- |\n| a\\|b |')
  })
  it('supports tables without leading or trailing pipes', function () {
    const view = editor('A | B\n--- | ---:\none | two', 0)
    selectTablePart(view, 'column')
    strictEqual(selectedTableMarkdown(view.state), '|A |\n|--- |\n|one |')
  })
  it('includes the delimiter when only the header row is selected', function () {
    const view = editor(TABLE, 2)
    selectTablePart(view, 'row')
    strictEqual(selectedTableMarkdown(view.state), TABLE.split('\n').slice(0, 2).join('\n'))
  })
  it('supports empty cells', function () {
    const doc = '| A | B |\n| --- | --- |\n|   |   |'
    const view = editor(doc, 2)
    rectangle(view, 1, 0, 1, 1)
    strictEqual(selectedTableMarkdown(view.state), '| | |\n| --- | --- |\n|   |   |')
  })
  it('does not include text or another table around the selected table', function () {
    const prefix = 'Before\n\n'
    const view = editor(prefix + TABLE + '\n\nAfter\n\n' + TABLE, prefix.length + 2)
    selectTablePart(view, 'table')
    strictEqual(selectedTableMarkdown(view.state), TABLE)
    strictEqual(view.state.field(tableSelectionField)?.tableFrom, prefix.length)
  })
  it('returns false outside a table and leaves the document unchanged', function () {
    const view = editor('Plain text', 0)
    strictEqual(selectTablePart(view, 'table'), false)
    strictEqual(selectedTableMarkdown(view.state), undefined)
  })
  it('clears a rectangle on text edits and cursor changes', function () {
    const view = editor()
    selectTablePart(view, 'table')
    view.dispatch({ changes: { from: 2, to: 3, insert: 'X' } })
    strictEqual(view.state.field(tableSelectionField), null)
    selectTablePart(view, 'column')
    view.dispatch({ selection: { anchor: 2 } })
    strictEqual(view.state.field(tableSelectionField), null)
  })
  it('retains the selection across unrelated effects', function () {
    const view = editor()
    selectTablePart(view, 'row')
    view.dispatch({})
    strictEqual(selectedTableMarkdown(view.state), '| | | |\n| :--- | ---: | :---: |\n| **one** | two | three |')
  })
  it('clears only selected cell contents, preserving table syntax and other columns', function () {
    const view = editor()
    rectangle(view, 2, 1, 1, 1)
    strictEqual(clearSelectedCells(view), true)
    deepStrictEqual(view.state.doc.toString().split('\n'), [
      '| A | B | C |', '| :--- | ---: | :---: |',
      '| **one** |  | three |', '| four |  | six |'
    ])
    strictEqual(view.state.field(tableSelectionField), null)
    strictEqual(clearSelectedCells(view), false)
  })
  it('uses the context-menu cell instead of a previous cursor for row selection', function () {
    const view = editor()
    selectTablePart(view, 'row', TABLE.indexOf('five'))
    strictEqual(selectedTableMarkdown(view.state), '| | | |\n| :--- | ---: | :---: |\n| four | five | six |')
  })
  it('copies to the clipboard without changing the document', async function () {
    const view = editor()
    selectTablePart(view, 'column')
    const write = navigator.clipboard.writeText
    const copied: string[] = []
    navigator.clipboard.writeText = async text => { copied.push(text) }
    try {
      strictEqual(copyTableSelection(view), true)
      await Promise.resolve()
      deepStrictEqual(copied, ['| B |\n| ---: |\n| two |\n| five |'])
      strictEqual(view.state.doc.toString(), TABLE)
    } finally { navigator.clipboard.writeText = write }
  })
  it('does not delete contents if clipboard access is rejected', async function () {
    const view = editor()
    selectTablePart(view, 'column')
    const write = navigator.clipboard.writeText
    const error = console.error
    navigator.clipboard.writeText = async () => { throw new Error('Clipboard denied') }
    console.error = () => {}
    try {
      copyTableSelection(view, true)
      await new Promise(resolve => setTimeout(resolve, 0))
      strictEqual(view.state.doc.toString(), TABLE)
    } finally { navigator.clipboard.writeText = write; console.error = error }
  })
  it('does not delete a new selection while clipboard access is pending', async function () {
    const view = editor()
    selectTablePart(view, 'column')
    const write = navigator.clipboard.writeText
    let finish!: () => void
    navigator.clipboard.writeText = () => new Promise<void>(resolve => { finish = resolve })
    try {
      copyTableSelection(view, true)
      view.dispatch({ selection: { anchor: 2 } })
      finish()
      await Promise.resolve()
      strictEqual(view.state.doc.toString(), TABLE)
    } finally { navigator.clipboard.writeText = write }
  })

  it('extends and shrinks the active corner without moving the anchor', function () {
    const view = editor()
    rectangle(view, 1, 1, 1, 1)
    strictEqual(extendTableSelection(view, 1, 0), true)
    extendTableSelection(view, 0, 1)
    deepStrictEqual(view.state.field(tableSelectionField), {
      tableFrom: 0, anchor: { row: 1, col: 1 }, head: { row: 2, col: 2 }
    })
    extendTableSelection(view, -1, 0)
    extendTableSelection(view, 0, -1)
    strictEqual(selectedTableMarkdown(view.state), '| |\n| ---: |\n| two |')
  })

  it('allows the active corner to cross the anchor', function () {
    const view = editor()
    rectangle(view, 1, 1, 1, 1)
    extendTableSelection(view, 0, -1)
    strictEqual(selectedTableMarkdown(view.state), '| | |\n| :--- | ---: |\n| **one** | two |')
    extendTableSelection(view, 0, 1)
    extendTableSelection(view, 0, 1)
    strictEqual(selectedTableMarkdown(view.state), '| | |\n| ---: | :---: |\n| two | three |')
  })

  it('keeps keyboard selections within all four table edges', function () {
    const view = editor()
    rectangle(view, 1, 1, 0, 0)
    extendTableSelection(view, -1, 0)
    extendTableSelection(view, 0, -1)
    deepStrictEqual(view.state.field(tableSelectionField)?.head, { row: 0, col: 0 })
    rectangle(view, 1, 1, 2, 2)
    extendTableSelection(view, 1, 0)
    extendTableSelection(view, 0, 1)
    deepStrictEqual(view.state.field(tableSelectionField)?.head, { row: 2, col: 2 })
    strictEqual(view.state.doc.toString(), TABLE)
  })

  it('leaves ordinary text selection to the editor when no cell selection exists', function () {
    const view = editor()
    strictEqual(extendTableSelection(view, 0, 1), false)
    strictEqual(view.state.field(tableSelectionField), null)
  })

  it('keeps control identity and focus across updates', function () {
    const view = editor()
    const cell = document.createElement('td')
    document.body.appendChild(cell)
    try {
      updateTableControls(cell, view, 0, 0)
      const button = cell.querySelector<HTMLButtonElement>('.cm-table-select.row')!
      button.focus()
      updateTableControls(cell, view, 0, 0)
      strictEqual(cell.querySelector('.cm-table-select.row'), button)
      strictEqual(document.activeElement, button)
      strictEqual(cell.querySelectorAll('button').length, 9)
    } finally { cell.remove() }
  })

  it('uses updated cell offsets when an existing control is activated', function () {
    const view = editor()
    const cell = document.createElement('td')
    cell.dataset.cellFrom = String(TABLE.indexOf('two'))
    updateTableControls(cell, view, 1, 0)
    const button = cell.querySelector<HTMLButtonElement>('.cm-table-select.row')!
    cell.dataset.cellFrom = String(TABLE.indexOf('five'))
    updateTableControls(cell, view, 2, 0)
    button.click()
    strictEqual(selectedTableMarkdown(view.state), '| | | |\n| :--- | ---: | :---: |\n| four | five | six |')
  })

  it('deletes the control row rather than the previous selection and supports undo', function () {
    const view = editor()
    selectTablePart(view, 'table')
    const cell = document.createElement('td')
    cell.dataset.cellFrom = String(TABLE.indexOf('five'))
    updateTableControls(cell, view, 2, 0)
    cell.querySelector<HTMLButtonElement>('.cm-table-delete.row')!.click()
    strictEqual(view.state.doc.toString(), TABLE.slice(0, TABLE.lastIndexOf('\n') + 1))
    strictEqual(undo(view), true)
    strictEqual(view.state.doc.toString(), TABLE)
  })

  it('deletes the control column rather than the cursor column and supports undo', function () {
    const view = editor()
    const cell = document.createElement('th')
    cell.dataset.cellFrom = String(TABLE.indexOf('C'))
    updateTableControls(cell, view, 0, 2)
    cell.querySelector<HTMLButtonElement>('.cm-table-delete.column')!.click()
    strictEqual(view.state.doc.toString().includes('three'), false)
    strictEqual(view.state.doc.toString().includes('two'), true)
    strictEqual(undo(view), true)
    strictEqual(view.state.doc.toString(), TABLE)
  })

  it('does not intercept Shift-click text selection without an existing cell selection', function () {
    const previousRequest = window.requestAnimationFrame
    const previousCancel = window.cancelAnimationFrame
    window.requestAnimationFrame = global.requestAnimationFrame
    window.cancelAnimationFrame = global.cancelAnimationFrame
    const view = new EditorView({ state: EditorState.create({ doc: TABLE, extensions: [markdownParser(), tableSelection] }) })
    const table = document.createElement('table')
    table.innerHTML = '<tbody><tr><td data-cell-from="2" data-row="0" data-col="0">A</td></tr></tbody>'
    table.dataset.tableFrom = '0'
    view.dom.appendChild(table)
    try {
      const event = new window.MouseEvent('mousedown', { button: 0, shiftKey: true, bubbles: true, cancelable: true })
      table.querySelector('td')!.dispatchEvent(event)
      strictEqual(event.defaultPrevented, false)
      strictEqual(view.state.field(tableSelectionField), null)
    } finally {
      view.destroy()
      window.requestAnimationFrame = previousRequest
      window.cancelAnimationFrame = previousCancel
    }
  })

  it('updates dragging only when the selected rectangle changes', function () {
    const previousRequest = window.requestAnimationFrame
    const previousCancel = window.cancelAnimationFrame
    const previousElementFromPoint = document.elementFromPoint
    window.requestAnimationFrame = global.requestAnimationFrame
    window.cancelAnimationFrame = global.cancelAnimationFrame
    const view = new EditorView({ state: EditorState.create({ doc: TABLE, extensions: [markdownParser(), tableSelection] }) })
    const table = document.createElement('table')
    table.innerHTML = '<tbody><tr><td data-cell-from="2" data-row="0" data-col="0">A</td><td data-cell-from="6" data-row="0" data-col="1">B</td></tr></tbody>'
    table.dataset.tableFrom = '0'
    view.dom.appendChild(table)
    const cells = table.querySelectorAll('td')
    try {
      cells[0].dispatchEvent(new window.MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true }))
      document.elementFromPoint = () => cells[0]
      document.dispatchEvent(new window.MouseEvent('mousemove', { buttons: 1 }))
      strictEqual(view.state.field(tableSelectionField), null)
      document.elementFromPoint = () => cells[1]
      document.dispatchEvent(new window.MouseEvent('mousemove', { buttons: 1 }))
      deepStrictEqual(view.state.field(tableSelectionField)?.head, { row: 0, col: 1 })
      const state = view.state
      document.dispatchEvent(new window.MouseEvent('mousemove', { buttons: 1 }))
      strictEqual(view.state, state)
      document.dispatchEvent(new window.MouseEvent('mouseup'))
      document.elementFromPoint = () => cells[0]
      document.dispatchEvent(new window.MouseEvent('mousemove', { buttons: 1 }))
      strictEqual(view.state, state)
    } finally {
      view.destroy()
      window.requestAnimationFrame = previousRequest
      window.cancelAnimationFrame = previousCancel
      document.elementFromPoint = previousElementFromPoint
    }
  })

  for (const direction of ['previous', 'next'] as const) {
    it(`moves the indicated row ${direction === 'previous' ? 'up' : 'down'} and supports undo`, function () {
      const view = editor()
      selectTablePart(view, 'table')
      const cell = document.createElement('td')
      const row = direction === 'previous' ? 2 : 1
      cell.dataset.cellFrom = String(TABLE.indexOf(row === 2 ? 'four' : '**one**'))
      updateTableControls(cell, view, row, 0, 3, 3)
      cell.querySelector<HTMLButtonElement>(`.cm-table-move.row.${direction}`)!.click()
      deepStrictEqual(view.state.doc.toString().split('\n'), [
        '| A | B | C |', '| :--- | ---: | :---: |',
        '| four | five | six |', '| **one** | two | three |'
      ])
      strictEqual(undo(view), true)
      strictEqual(view.state.doc.toString(), TABLE)
    })
    it(`moves the indicated column ${direction === 'previous' ? 'left' : 'right'} and supports undo`, function () {
      const view = editor()
      selectTablePart(view, 'table')
      const cell = document.createElement('th')
      const col = direction === 'previous' ? 2 : 1
      cell.dataset.cellFrom = String(TABLE.indexOf(col === 2 ? 'C' : 'B'))
      updateTableControls(cell, view, 0, col, 3, 3)
      cell.querySelector<HTMLButtonElement>(`.cm-table-move.column.${direction}`)!.click()
      deepStrictEqual(view.state.doc.toString().split('\n'), [
        '| A | C | B |', '| :--- | ---: | :---: |',
        '| **one** | three | two |', '| four | six | five |'
      ])
      strictEqual(undo(view), true)
      strictEqual(view.state.doc.toString(), TABLE)
    })
  }

  it('disables moves beyond the table edges and refreshes them after updates', function () {
    const view = editor()
    const cell = document.createElement('th')
    cell.dataset.cellFrom = '2'
    updateTableControls(cell, view, 0, 0, 1, 1)
    for (const button of cell.querySelectorAll<HTMLButtonElement>('.cm-table-move')) {
      strictEqual(button.disabled, true)
      button.click()
    }
    strictEqual(view.state.doc.toString(), TABLE)
    updateTableControls(cell, view, 0, 0, 3, 3)
    strictEqual(cell.querySelector<HTMLButtonElement>('.cm-table-move.row.next')!.disabled, false)
    strictEqual(cell.querySelector<HTMLButtonElement>('.cm-table-move.column.next')!.disabled, false)
    strictEqual(cell.querySelector<HTMLButtonElement>('.cm-table-move.row.previous')!.disabled, true)
    strictEqual(cell.querySelector<HTMLButtonElement>('.cm-table-move.column.previous')!.disabled, true)
  })

  it('moves a short header below a long data row without invalid cursor positions', function () {
    const header = '| A | B |'
    const delimiter = '| --- | --- |'
    const row = '| ' + 'long content '.repeat(30) + '| value |'
    const doc = [header, delimiter, row].join('\n')
    const view = editor(doc, 2)
    const cell = document.createElement('th')
    cell.dataset.cellFrom = '2'
    updateTableControls(cell, view, 0, 0, 2, 2)
    cell.querySelector<HTMLButtonElement>('.cm-table-move.row.next')!.click()
    strictEqual(view.state.doc.toString(), [row, delimiter, header].join('\n'))
    strictEqual(undo(view), true)
    strictEqual(view.state.doc.toString(), doc)
  })


  it('round-trips every rectangle and drag direction as a complete Markdown table', function () {
    function parse (markdown: string) {
      const state = EditorState.create({ doc: markdown, extensions: [markdownParser()] })
      const node = syntaxTree(state).topNode.getChild('Table')
      strictEqual(node?.from, 0, markdown)
      strictEqual(node?.to, markdown.length, markdown)
      const table = parseTableNode(node!, markdown)
      if (table.type !== 'Table') { throw new Error('Expected a Markdown table') }
      return table
    }
    const original = parse(TABLE)
    for (let anchorRow = 0; anchorRow < 3; anchorRow++) {
      for (let anchorCol = 0; anchorCol < 3; anchorCol++) {
        for (let headRow = 0; headRow < 3; headRow++) {
          for (let headCol = 0; headCol < 3; headCol++) {
            const view = editor()
            rectangle(view, anchorRow, anchorCol, headRow, headCol)
            const markdown = selectedTableMarkdown(view.state)!
            const copied = parse(markdown)
            const firstRow = Math.min(anchorRow, headRow)
            const lastRow = Math.max(anchorRow, headRow)
            const firstCol = Math.min(anchorCol, headCol)
            const lastCol = Math.max(anchorCol, headCol)
            deepStrictEqual(copied.alignment, original.alignment.slice(firstCol, lastCol + 1))
            const data = firstRow === 0 ? copied.rows : copied.rows.slice(1)
            deepStrictEqual(data.map(row => row.cells.map(cell => cell.textContent.trim())),
              original.rows.slice(firstRow, lastRow + 1).map(row =>
                row.cells.slice(firstCol, lastCol + 1).map(cell => cell.textContent.trim())))
            if (firstRow > 0) {
              strictEqual(copied.rows[0].cells.every(cell => cell.textContent.trim() === ''), true)
            }
          }
        }
      }
    }
  })

})
