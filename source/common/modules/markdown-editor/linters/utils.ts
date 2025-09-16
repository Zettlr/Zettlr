/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Linter Utilities
 * CVM-Role:        Linter
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     These utilites are used to prepare text ranges
 *                  and filter diagnostics for linting.
 *
 * END HEADER
 */
import {
  StateField,
  StateEffect,
  ChangeSet,
  type StateEffectType,
  type Transaction,
  type ChangeDesc,
  type EditorState
} from '@codemirror/state'
import { forEachDiagnostic, type Diagnostic } from '@codemirror/lint'
import { rangesOverlap, mergeRanges } from '../util/expand-selection'
import type { Range, getWordPosition, getLinePosition, getBlockPosition, getNodePosition } from '../util/expand-selection'

type ContextCallbacks = typeof getWordPosition | typeof getLinePosition | typeof getBlockPosition | typeof getNodePosition
// type Range = { from: number, to?: number }

/**
 * This factory function returns a StateEffect and Statefield to control linting contexts.
 *
 * @return  {{ set: StateEffectType<Range|null>, lint: StateField<ChangeDesc> }}
 */
export function changesFieldEffectFactory (): { set: StateEffectType<Range|null>, lint: StateField<ChangeDesc> } {
  const setChangesEffect = StateEffect.define<Range|null>()

  const lintChangesField = StateField.define<ChangeDesc>({
    // create a ChangeSet that covers the entire document so that
    // the entire document is linted on startup.
    create: (state) => ChangeSet.of({ from: 0, to: state.doc.length, insert: state.doc.toString() }, state.doc.length).desc,
    update (value, transaction: Transaction) {
      for (let e of transaction.effects) {
        if (e.is(setChangesEffect)) {
          if (e.value === null) {
            return ChangeSet.empty(transaction.newDoc.length).desc
          }

          const insert = transaction.newDoc.sliceString(e.value.from, e.value.to)
          return ChangeSet.of({ from: e.value.from, to: e.value.to, insert: insert }, transaction.newDoc.length).desc
        }
      }

      if (!transaction.docChanged) {
        return value
      }

      const composedChanges = value.composeDesc(transaction.changes.desc)

      return composedChanges
    }
  })

  return { set: setChangesEffect, lint: lintChangesField }
}

/**
 * Prepare ranges and diagnostics for linting.
 *
 * @param   {EditorView}              view          The codemirror editor view
 * @param   {StateField<ChangeDesc>}  field         A `StateField` which returns a `ChangeDesc`
 * @param   {string}                  [source]      Optional. A diagnostic source to filter
 * @param   {ContextCallbacks}        [callback]    Optional. A callback which expands the range
 * @param   {number}                  [context]     Optional. Passed to `callback` to set how
 *                                                  much to expand the range by
 *
 * @return  {{ ranges: Range[], diagnostics: Diagnostic[] }}  The new ranges to lint and the remaining valid diagnostics
 */
export function prepareDiagnostics (
  state: EditorState,
  field: StateField<ChangeDesc>,
  source?: string,
  callback?: ContextCallbacks,
  context?: number
): { ranges: Range[], diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = []
  let ranges: Range[] = []

  const changes = state.field(field)

  changes.iterChangedRanges((_, __, fromB, toB) => {
    // we expand the context to ensure a better lint
    const { from, to } = callback !== undefined ? callback(state, fromB, toB, context) : { from: fromB, to: toB }
    ranges.push({ from, to })
  })

  // `forEachDiagnostic` tracks the new position of the diagnostic, so
  // we can just push the diagnostic with the updated `from` and `to`.
  forEachDiagnostic(state, (d, from, to) => {
    // if `source` was provided, filter the diagnostics
    // which match, otherwise, run over all diagnostics.
    const filter = source !== undefined ? d.source?.includes(source) ?? false : true

    if (filter) {
      if (!rangesOverlap({ from: d.from, to: d.to }, ranges)) {
        diagnostics.push({
          ...d,
          from: from,
          to: to,
        })
      } else {
        // since the changed ranges overlap with the diagnostic
        // we need to expand the context to include the entire diagnostic
        // to ensure we lint correctly
        ranges.push({ from, to })
      }
    }
  })

  // sort the ranges and merge any overlapping regions
  ranges = mergeRanges(ranges)

  return { ranges, diagnostics }
}
