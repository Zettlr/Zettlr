/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableEditor Subview methods
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains a set of methods that are used to 
 *                  create and manage subviews within table editor widgets. A
 *                  subview is a CodeMirror instance that mirrors the main
 *                  document, but only allows editing the span of text within a
 *                  given table cell.
 *
 * END HEADER
 */

import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { EditorState, Prec, StateField, type ChangeSpec, type Range } from '@codemirror/state'
import { EditorView, drawSelection, type DecorationSet, Decoration, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import markdownParser from '../parser/markdown-parser'
import { tableEditorKeymap } from '../keymaps/table-editor'
import { dispatchFromSubview, maybeDispatchToSubview, syncAnnotation } from './util/data-exchange'
import { configField, type EditorConfiguration } from '../util/configuration'
import { getMainEditorThemes } from '../editor-extension-sets'
import { darkMode } from '../theme/dark-mode'
import { markdownSyntaxHighlighter } from '../theme/syntax'

/**
 * A transaction filter that ensures that any changes made to the view that
 * don't come from the main view (i.e., are not synchronizing) are sanitized so
 * that they never exceed the cell's boundaries.
 */
const ensureBoundariesFilter = EditorState.transactionFilter.of((tr) => {
  if (tr.annotation(syncAnnotation) === true) {
    return tr // Do not mess with synchronizing transactions
  }

  // NOTE: There are also cell boundaries written to the TD/TH's dataset, but
  // we can't use those since they strictly exclude *any* whitespace from the
  // cell's contents. This means that, would we use those to determine the
  // selection ranges, any time a user enters a space, this space would be
  // considered "out of the cell", and as such the user could not enter any
  // text afterwards. By looking at the hide-decorations (which are
  // constantly mapped through any changes and thus constitute a "moving
  // target") we can account for that. Basically, the hideDeco field "freezes"
  // the spaces outside of the table cell on editing, and therefore adds any
  // manually added space to the cell's content.

  // Here, we retrieve the boundaries from the given StateField. By mapping
  // only those through the ChangeSet and not recomputing the entire state
  // (e.g., by accessing tr.state), we keep the computational overhead small.
  // NOTE the associations (also in the hidden state updater)
  const [ cellFrom, cellTo ] = tr.startState.field(hiddenSpanField)
    .cellRange.map((pos, idx) => tr.changes.mapPos(pos, idx - 1))

  // First, find the longest cell range after the transaction has been
  // applied. This is necessary to accurately figure out whether the selection
  // will be moved past where the cell boundaries will end up after applying
  // this transaction. In practical terms: If the user inserts a character at
  // the very end of the table cell, the selection will be one position beyond
  // the current cell range. This check means that we account for that.
  let cellEndAfter = cellTo
  tr.changes.iterChanges((fromA, toA, fromB, toB) => {
    if (fromA >= cellFrom && toA <= cellTo && toB > cellEndAfter) {
      cellEndAfter = toB
    }
  })

  // TODO: Right now it works all adequately for our purposes. There is one
  // edge-case, though: The CodeMirror parser counts as TableCell contents
  // exclusively non-whitespace within the cell, and excludes any whitespace
  // before and after. This means that, if the user types a space, and then
  // attempts to write something, this would prevent this, as the cursor is
  // now outside of what is considered the cell range for CodeMirror. However,
  // it should be noted that the hide-decorations still accurately reflect the
  // proper boundaries (they include any whitespace that was in the cell
  // before the view got instantiated, but exclude any whitespace added to the
  // cell after the fact.)
  if (tr.selection !== undefined && cellFrom !== cellTo && cellTo > 0) {
    const { from, to } = tr.selection.main
    if (from < cellFrom || to > cellEndAfter) {
      console.log('Disallowing transaction', { from, cellFrom, to, cellTo, cellEndAfter })
      return [] // Disallow this transaction
    }
  }

  if (!tr.docChanged) {
    return tr
  }

  // Ensure that any changes are safe to apply without breaking the table or
  // removing things people don't want to remove.
  const safeChanges: ChangeSpec[] = []
  let shouldOverrideTransaction = false
  tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    // First: Ensure that the transaction does not mess with the hidden ranges
    if (fromA < cellFrom || toA < cellFrom || fromA > cellTo) {
      // With this flag set, all other safe changes will be used to override
      // the transaction
      shouldOverrideTransaction = true
      return
    }

    // Next, ensure that no newlines will be inserted into the table cell
    const ins = inserted.toString()
    const safeInsertion = ins.includes('\n') ? ins.replace(/\n+/g, ' ') : ins
    safeChanges.push({ from: fromA, to: toA, insert: safeInsertion })
    if (safeInsertion !== ins) {
      shouldOverrideTransaction = true
    }
  })

  return shouldOverrideTransaction ? { ...tr, changes: safeChanges } : tr
})

interface hiddenSpanState {
  decorations: DecorationSet
  cellRange: [number, number]
}

/**
 * A StateField whose sole purpose is to hide the two stretches of content
 * before and after the table cell contents.
 */
export const hiddenSpanField = StateField.define<hiddenSpanState>({
  create (state) {
    // NOTE: Override using `init`! Otherwise this extension won't do much.
    return {
      decorations: Decoration.none,
      cellRange: [ 0, state.doc.length ]
    }
  },
  update (value, tr) {
    if (!tr.docChanged) {
      return value
    } else {
      // Ensure the range always stays the same
      return {
        decorations: value.decorations.map(tr.changes),
        cellRange: [
          // The assocs ensure that it's really an "outer" bound and any text
          // inserted in there stays within this cell range. If we didn't
          // provide it, inserting a character in an empty range (from === to)
          // would cause that inserted character to end up right to the `to`.
          tr.changes.mapPos(value.cellRange[0], -1),
          tr.changes.mapPos(value.cellRange[1], 1)
        ]
      }
    }
  },
  provide: f => EditorView.decorations.from(f, (value) => value.decorations)
})

/**
 * Creates a set of four decorations that hide the spans before and after the
 * provided cell range. Provide the result of this function to the hiddenSpanField's init method.
 *
 * @param   {EditorState}                    state   The main editor state
 * @param   {{ from: number, to: number }}  cellRange  The cell range
 *
 * @return  {DecorationSet}                            The initial deco set
 */
function createHiddenDecorations (state: EditorState, cellRange: { from: number, to: number }): DecorationSet {
  const { from, to } = state.doc.lineAt(cellRange.from)
  // The table cell can be at the start/end of a line/document, and CodeMirror
  // does not allow atomic ranges where from === to. Therefore, conditional
  // ranges

  const decorations: Array<Range<Decoration>> = []

  // 1: Block before
  if (from - 1 > 0) {
    decorations.push(
      Decoration.replace({ block: true, inclusive: true }).range(0, from - 1)
    )
  }
  // 2: Line until cellRange.from
  if (cellRange.from > from) {
    decorations.push(
      Decoration.replace({ block: false, inclusive: false })
        .range(from, cellRange.from)
    )
  }
  // 3: Line after cellRange.to
  if (to > cellRange.to) {
    decorations.push(
      Decoration.replace({ block: false, inclusive: false })
        .range(cellRange.to, to)
    )
  }
  // 4: Block after
  if (state.doc.length > to + 1) {
    decorations.push(
      Decoration.replace({ block: true, inclusive: true })
        .range(to + 1, state.doc.length)
    )
  }

  return Decoration.set(decorations)
}

/**
* Creates and mounts a sub-EditorView within the provided targetCell.
*
* @param  {EditorView}      mainView        The main view
* @param  {HTMLDivElement}  contentWrapper  The cell's content wrapper
*/
export function createSubviewForCell (
  mainView: EditorView,
  contentWrapper: HTMLDivElement,
  cellRange: { from: number, to: number }
): void {
  const cfg: EditorConfiguration = JSON.parse(JSON.stringify(mainView.state.field(configField)))
  const themes = getMainEditorThemes()

  const state = EditorState.create({
    // Subviews always hold the entire document. This is to make synchronizing
    // updates between main and subviews faster and simpler. This should only
    // become a problem on very old computers for people working with 100MB
    // documents. This assumes that this would be an edge case. Note to future
    // me: "You knew there was going to be this guy who now keeps peskering me
    // because he can't edit his ten-million line JSON files without waiting
    // three seconds for the changes to be applied to his overweight text file."
    doc: mainView.state.sliceDoc(),
    selection: mainView.state.selection,
    extensions: [
      // A minimal set of extensions
      Prec.highest(tableEditorKeymap(mainView)),
      drawSelection({ drawRangeCursor: false, cursorBlinkRate: 1000 }),
      // Add the configuration and preset it with whatever is in the main view.
      // The config field will automagically update since we forward any effects
      // to the subview.
      configField.init(_state => cfg),
      darkMode({ darkMode: cfg.darkMode, ...themes[cfg.theme] }),
      syntaxHighlighting(defaultHighlightStyle),
      markdownSyntaxHighlighter(),
      EditorView.lineWrapping,
      markdownParser(), // TODO: Config?
      // Two custom extensions that are required for the specific use-case of
      // this single-line minimal EditorView
      hiddenSpanField.init(s => {
        return {
          decorations: createHiddenDecorations(s, cellRange),
          cellRange: [ cellRange.from, cellRange.to ]
        }
      }),
      ensureBoundariesFilter
    ]
  })

  const subview = new EditorView({
    state,
    parent: contentWrapper,
    // Route any updates to the main view. Apply those coming in from the main
    // view.
    dispatch: dispatchFromSubview(mainView)
  })

  // We must delay the subview focusing until the DOM has been updated and any
  // other callbacks and event listeners have been attached. We achieve this
  // using `setTimeout` which will execute its callback once the main loop is
  // empty.
  setTimeout(() => subview.focus(), 0)
}

/**
 * A view plugin that passes any transaction from the main view into the various
 * subviews.
 */
export const subviewUpdatePlugin = ViewPlugin.define(view => ({
  update (u: ViewUpdate) {
    const cells = [
      ...view.dom.querySelectorAll('.cm-table-editor-widget td'),
      ...view.dom.querySelectorAll('.cm-table-editor-widget th')
    ] as HTMLTableCellElement[]

    for (const cell of cells) {
      const subview = EditorView.findFromDOM(cell)
      if (subview !== null) {
        for (const tr of u.transactions) {
          maybeDispatchToSubview(subview, tr)
        }
      }
    }
  }
}))
