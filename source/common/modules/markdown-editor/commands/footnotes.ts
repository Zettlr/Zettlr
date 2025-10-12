/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Footnotes Commands
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A collection of commands for adding, modifying, and removing footnotes.
 *
 * END HEADER
 */

// There are a few things people need to do with footnotes, all defined here:
// 1. Hover over them for a preview
// 2. Cmd-Click them to edit them in place
// 3. And, obviously, add and remove them

import { syntaxTree } from '@codemirror/language'
import { EditorState, type ChangeSpec } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { extractASTNodes, markdownToAST } from '@common/modules/markdown-utils'
import { type Footnote, type FootnoteRef } from '@common/modules/markdown-utils/markdown-ast'

/**
 * A command that adds a new footnote at the current main selection.
 *
 * @param   {EditorView}  target  The editor view.
 *
 * @return  {boolean}             Whether the command ran.
 */
export function addNewFootnote (target: EditorView): boolean {
  const ast = markdownToAST(target.state.sliceDoc())
  const identifiers = extractASTNodes(ast, 'Footnote') as Footnote[]
  const refs = extractASTNodes(ast, 'FootnoteRef') as FootnoteRef[]
  const changes: ChangeSpec[] = []

  // This is where our new footnote should be inserted
  let where = target.state.selection.main.from
  const doc = target.state.doc

  // Check that the user isn't accidentally within a footnote.
  const nodeAt = syntaxTree(target.state).resolve(where, 0)
  if (nodeAt.name === 'Footnote') {
    where = nodeAt.to
  }

  // Split up all identifiers into before and after. Before will be used to find
  // the new identifier, after will need to be adapted afterwards.
  const fnBefore = identifiers.filter(i => i.to <= where)
  const fnAfter = identifiers.filter(i => i.from > where)

  // Now find the new identifier. It'll be the highest number+1 of fnBefore.
  let newIdentifier = fnBefore.length + 1
  for (const fn of fnBefore) {
    const id = parseInt(fn.label, 10)
    if (!/^\d+$/.test(fn.label) || id < newIdentifier) {
      continue // A text label, or smaller than our new Identifier
    }
    newIdentifier = id + 1
  }

  // We additionally need the position of where to put the corresponding ref.
  let whereRef = doc.length // Default: end of document
  for (const ref of refs) {
    const id = parseInt(ref.label, 10)
    if (!/^\d+$/.test(ref.label) || id < newIdentifier) {
      continue // A text label, or smaller than our new Identifier
    }

    // This is the first ref which is not smaller than the new identifier
    whereRef = ref.from
    break
  }

  const isEOF = whereRef === doc.length
  const targetLine = doc.lineAt(whereRef).number
  const hasRefBefore = refs.filter(ref => ref.to <= whereRef).length > 0
  const isBeginningOfLine = doc.lineAt(whereRef).from === whereRef
  const prevLineNo = isBeginningOfLine ? targetLine - 1 : targetLine
  const emptyLineBefore = doc.line(prevLineNo).text.trim() === '' || isEOF

  // We don't need to add another newline if there is already an empty line
  // before, or if a ref ends just before this one. This keeps the footnote refs
  // separate from the main text body with a double line break, but keeps the
  // refs themselves tight.
  let prefix = ''
  if ((!isBeginningOfLine && hasRefBefore) || (isBeginningOfLine && isEOF)) {
    prefix = '\n' // Single newline between footnotes
  } else if (!emptyLineBefore && !hasRefBefore) {
    prefix = '\n\n' // Footnote paragraph should be separated by an empty line
  } else if (hasRefBefore && !isBeginningOfLine) {
    prefix = '\n'
  } else if (isEOF && !isBeginningOfLine) {
    prefix = '\n\n'
  }

  let suffix = isEOF ? '' : '\n'

  // Now we can add the first two changes that will insert the new footnote
  changes.push({ from: where, insert: `[^${newIdentifier}]` })
  changes.push({ from: whereRef, insert: `${prefix}[^${newIdentifier}]: ${suffix}` })

  // We need to maintain a tally of how many more or less characters will be
  // inserted AFTER the new footnote identifier and BEFORE the whereRef.
  let offsetChars = 0

  // Finally, we can renumber the following fns
  let id = newIdentifier + 1
  for (const fn of fnAfter) {
    if (!/^\d+$/.test(fn.label)) {
      continue // Exclude text-labels
    }

    if (fn.label === `${id}`) {
      // In this case, the footnote is already correct, but we have to increment
      id++
      continue
    }

    let from = fn.from + 2
    let to = fn.from + 2 + fn.label.length

    offsetChars += `${id}`.length - (to - from)

    changes.push({ from, to, insert: `${id}` })

    const ref = refs.find(ref => ref.label === fn.label)
    if (ref !== undefined) {
      if (ref.to < whereRef) {
        // Since footnote refs do not have to be ordered, some refs may occur
        // before whereRef, and thus need to be accounted for in the offset.
        offsetChars += `${id}`.length - (to - from)
      }

      from = ref.from + 2
      to = ref.from + 2 + ref.label.length
      changes.push({ from, to, insert: `${id}` })
    }
    id++
  }

  // And go.
  target.dispatch({
    changes,
    // Offset like this:
    // 5 = [^]:\s\n (the ref, NOTE we exclude the newline)
    // 3 = [^] (the identifier)
    // 2x the new number length
    // Any offset chars, since the selection must be in terms of characters AFTER the update
    selection: { anchor: whereRef + 5 + prefix.length + 3 + String(newIdentifier).length * 2 + offsetChars }
  })
  return true
}

/**
 * This command should run on delete. It tests if there is a Footnote next to
 * the cursor that would be deleted. If so, it first selects the footnote
 * entirely. This serves two purposes: (a) footnote deletion happens for the
 * entire node, and (b) a double-check to visually tell the user they are about
 * to delete a footnote now.
 *
 * @param   {EditorView}  target  The editor view.
 *
 * @return  {boolean}             Whether the command did something.
 */
export function selectFootnoteBeforeDelete (target: EditorView): boolean {
  if (!target.state.selection.main.empty) {
    return false
  }

  const pos = target.state.selection.main.head
  const node = syntaxTree(target.state).resolveInner(pos, -1)
  if (node.type.name === 'Footnote' && node.to === pos) {
    target.dispatch({ selection: { anchor: node.to, head: node.from } })
    return true
  }

  return false
}

/**
 * This transaction filter checks each incoming transaction and does two things.
 * First, it checks if the user removed either a footnote or its ref, and
 * removes the counterpart automatically. Then, it looks through the remaining,
 * valid footnotes and adapts the numbering so that they are sorted ascending.
 *
 * @param   {Transaction}  tr  The transaction
 *
 * @return  {Transaction}      The original or modified transaction
 */
export const cleanupFootnotesAndNumbering = EditorState.transactionFilter.of(tr => {
  // Only runs on document changes
  if (!tr.docChanged) {
    return tr
  }

  // NOTE: The documentation states that accessing the new state is not advised
  // since this will effectively perform two transaction for every individual
  // one that the user starts. However, using the new state and then start
  // basing our changes on that makes the entire code much simpler. This is why
  // we double-check first that the footnotes are in any way affected by this
  // change. This way, a second transaction will only be created when there was
  // a probable change in the footnotes. Below's change tries to be as
  // conservative as possible, meaning that some false positives are possible.
  const oldAst = markdownToAST(tr.startState.sliceDoc())
  const relevantNodes = extractASTNodes(oldAst, 'Footnote')
    .concat(extractASTNodes(oldAst, 'FootnoteRef'))

  let possiblyChanged = false
  tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    if (possiblyChanged) {
      return
    }

    // Condition 1: Any existing footnote or ref is touched by a change.
    if (!relevantNodes.every(fn => fn.from > toA || fn.to < fromA)) {
      possiblyChanged = true
      return
    }

    // Condition 2: The inserted text contains text that even remotely appears
    // to be part of a footnote or ref.
    if (inserted.length > 0 && inserted.sliceString(0).includes('[^')) {
      possiblyChanged = true
    }
  })

  if (!possiblyChanged) {
    return tr
  }
  
  // NOTE: Calculates the new state.
  const newDoc = tr.state.sliceDoc()
  const ast = markdownToAST(newDoc)
  const identifiers = extractASTNodes(ast, 'Footnote') as Footnote[]
  const refs = extractASTNodes(ast, 'FootnoteRef') as FootnoteRef[]

  const changes: ChangeSpec[] = []

  // Step 1: Cleanup.

  // Find any footnote references whose matching footnote is missing.
  for (const ref of refs) {
    if (!/^\d+$/.test(ref.label)) {
      continue // A non-numeric footnote label
    }

    const matchingFootnote = identifiers.find(fn => fn.label === ref.label)
    if (matchingFootnote === undefined) {
      // No matching footnote found
      changes.push({ from: ref.from, to: newDoc.length > ref.to ? ref.to + 1 : ref.to, insert: '' })
      // Remove this ID from the identifier set so that it isn't accounted for
      // in the second step.
      refs.splice(refs.indexOf(ref), 1)
    }
  }

  // Next, do the same for rogue footnotes.
  for (const fn of identifiers) {
    if (!/^\d+$/.test(fn.label)) {
      continue // A non-numeric footnote label
    }

    const matchingRef = refs.find(r => r.label === fn.label)
    if (matchingRef === undefined) {
      changes.push({ from: fn.from, to: fn.to, insert: '' })
      identifiers.splice(identifiers.indexOf(fn), 1)
    }
  }

  // Step 2: Adjust the numbering for the remaining, valid footnotes.

  let fnIdx = 1
  for (const fn of identifiers) {
    if (!/^\d+$/.test(fn.label)) {
      continue // A non-numeric footnote label
    }

    if (parseInt(fn.label, 10) !== fnIdx) {
      // Footnote index is wrong -> adapt
      changes.push({ from: fn.from, to: fn.to, insert: `[^${fnIdx}]` })
      const matchingRef = refs.find(r => r.label === fn.label)
      if (matchingRef !== undefined) {
        changes.push({ from: matchingRef.labelFrom, to: matchingRef.labelTo, insert: String(fnIdx) })
      }
    }
    fnIdx++
  }

  if (changes.length === 0) {
    return tr // Nothing changed
  }

  // Now we have changes that describe a change from doc B to doc C, based on a
  // state produced by changes from doc A to doc B. Here we turn the changes
  // into a changeset, and then compose both to get a set from doc A directly to
  // doc C that can then be applied.
  // We overwrite the existing changeset with the new one.
  const changeSetBtoC = tr.state.changes(changes)
  const changeSetAtoC = tr.changes.compose(changeSetBtoC)
  return { ...tr, changes: changeSetAtoC }
})
